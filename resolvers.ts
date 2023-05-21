import { AuthenticationError, ApolloError, UserInputError } from 'apollo-server';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { User, Movie, Review } from './types';

// Create a new instance of the PostgreSQL connection pool
const pool = new Pool({
  user: 'your_username',
  password: 'your_password',
  host: 'localhost',
  port: 5432,
  database: 'your_database_name',
});

// Secret key for JWT token
const SECRET_KEY = 'your-secret-key';

const resolvers = {
  Query: {
    getUser: async (parent: any, args: { id: number }): Promise<User | undefined> => {
      const query = 'SELECT * FROM users WHERE id = $1';
      const values = [args.id];
      const { rows } = await pool.query(query, values);
      return rows[0];
    },

    getMovie: async (parent: any, args: { id: number }): Promise<Movie | undefined> => {
      const query = 'SELECT * FROM movies WHERE id = $1';
      const values = [args.id];
      const { rows } = await pool.query(query, values);
      return rows[0];
    },

    getReviewsForMovie: async (parent: any, args: { movieId: number }): Promise<Review[]> => {
      const query = 'SELECT * FROM reviews WHERE movie_id = $1';
      const values = [args.movieId];
      const { rows } = await pool.query(query, values);
      return rows;
    },

    getAllMovies: async (parent: any, args: { sortBy?: string, filterBy?: string, page?: number, limit?: number }): Promise<Movie[]> => {
      let query = 'SELECT * FROM movies';
      const values = [];

      // Sorting
      if (args.sortBy) {
        const [field, order] = args.sortBy.split('_');
        query += ` ORDER BY ${field} ${order}`;
      }

      // Filtering
      if (args.filterBy) {
        const filterValue = `%${args.filterBy}%`;
        query += ' WHERE movie_name ILIKE $1 OR director_name ILIKE $1';
        values.push(filterValue);
      }

      // Pagination
      const page = args.page || 1;
      const limit = args.limit || 10;
      const offset = (page - 1) * limit;
      query += ` LIMIT ${limit} OFFSET ${offset}`;

      const { rows } = await pool.query(query);
      return rows;
    },
  },

  Mutation: {
    signUpUser: async (parent: any, args: User): Promise<User> => {
      const query = 'SELECT * FROM users WHERE email = $1';
      const values = [args.email];
      const { rows } = await pool.query(query, values);

      if (rows.length > 0) {
        throw new ApolloError('Email already exists.', 'DUPLICATE_EMAIL');
      }

      const insertQuery = 'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *';
      const insertValues = [args.userName, args.email, args.password];
      const insertResult = await pool.query(insertQuery, insertValues);

      return insertResult.rows[0];
    },

    loginUser: async (parent: any, args: { email: string, password: string }): Promise<string> => {
      const query = 'SELECT * FROM users WHERE email = $1';
      const values = [args.email];
      const { rows } = await pool.query(query, values);

      if (rows.length === 0) {
        throw new ApolloError('Invalid email or password.', 'INVALID_CREDENTIALS');
      }

      const user = rows[0];

      if (user.password !== args.password) {
        throw new ApolloError('Invalid email or password.', 'INVALID_CREDENTIALS');
      }

      const token = jwt.sign({ userId: user.id }, SECRET_KEY, { expiresIn: '1d' });
      return token;
    },

    changePassword: async (parent: any, args: { userId: number, newPassword: string }, context: any): Promise<User> => {
      const query = 'SELECT * FROM users WHERE id = $1';
      const values = [args.userId];
      const { rows } = await pool.query(query, values);

      if (rows.length === 0) {
        throw new ApolloError('User not found.', 'USER_NOT_FOUND');
      }

      const user = rows[0];

      if (user.id !== context.user.id) {
        throw new AuthenticationError('You are not authorized to change the password of this user.');
      }

      const updateQuery = 'UPDATE users SET password = $1 WHERE id = $2 RETURNING *';
      const updateValues = [args.newPassword, args.userId];
      const updateResult = await pool.query(updateQuery, updateValues);

      return updateResult.rows[0];
    },

    createMovie: async (parent: any, args: Movie, context: any): Promise<Movie> => {
      if (!context.user) {
        throw new AuthenticationError('You must be authenticated to create a movie.');
      }

      // Data validation
      if (!args.movieName || !args.description || !args.directorName || !args.releaseDate) {
        throw new UserInputError('Movie details are incomplete.');
      }

      const query = 'INSERT INTO movies (movie_name, description, director_name, release_date, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *';
      const values = [args.movieName, args.description, args.directorName, args.releaseDate, context.user.id];
      const { rows } = await pool.query(query, values);

      return rows[0];
    },

    updateMovie: async (parent: any, args: Movie, context: any): Promise<Movie | undefined> => {
      if (!context.user) {
        throw new AuthenticationError('You must be authenticated to update a movie.');
      }

      const query = 'SELECT * FROM movies WHERE id = $1';
      const values = [args.id];
      const { rows } = await pool.query(query, values);

      if (rows.length === 0) {
        throw new UserInputError('Movie not found.');
      }

      const movie = rows[0];

      if (movie.userId !== context.user.id) {
        throw new AuthenticationError('You are not authorized to update this movie.');
      }

      // Data validation
      if (!args.movieName || !args.description || !args.directorName || !args.releaseDate) {
        throw new UserInputError('Movie details are incomplete.');
      }

      const updateQuery = 'UPDATE movies SET movie_name = $1, description = $2, director_name = $3, release_date = $4 WHERE id = $5 RETURNING *';
      const updateValues = [args.movieName, args.description, args.directorName, args.releaseDate, args.id];
      const updateResult = await pool.query(updateQuery, updateValues);

      return updateResult.rows[0];
    },

    deleteMovie: async (parent: any, args: { id: number }, context: any): Promise<boolean> => {
      if (!context.user) {
        throw new AuthenticationError('You must be authenticated to delete a movie.');
      }

      const query = 'SELECT * FROM movies WHERE id = $1';
      const values = [args.id];
      const { rows } = await pool.query(query, values);

      if (rows.length === 0) {
        throw new UserInputError('Movie not found.');
      }

      const movie = rows[0];

      if (movie.userId !== context.user.id) {
        throw new AuthenticationError('You are not authorized to delete this movie.');
      }

      const deleteQuery = 'DELETE FROM movies WHERE id = $1';
      const deleteValues = [args.id];
      await pool.query(deleteQuery, deleteValues);

      return true;
    },

    createReview: async (parent: any, args: Review, context: any): Promise<Review> => {
      if (!context.user) {
        throw new AuthenticationError('You must be authenticated to create a review.');
      }

      // Data validation
      if (!args.movieId || !args.rating || !args.comment) {
        throw new UserInputError('Review details are incomplete.');
      }

      const query = 'INSERT INTO reviews (movie_id, user_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *';
      const values = [args.movieId, context.user.id, args.rating, args.comment];
      const { rows } = await pool.query(query, values);

      return rows[0];
    },

    updateReview: async (parent: any, args: Review, context: any): Promise<Review | undefined> => {
      if (!context.user) {
        throw new AuthenticationError('You must be authenticated to update a review.');
      }

      const query = 'SELECT * FROM reviews WHERE id = $1';
      const values = [args.id];
      const { rows } = await pool.query(query, values);

      if (rows.length === 0) {
        throw new UserInputError('Review not found.');
      }

      const review = rows[0];

      if (review.userId !== context.user.id) {
        throw new AuthenticationError('You are not authorized to update this review.');
      }

      // Data validation
      if (!args.rating || !args.comment) {
        throw new UserInputError('Review details are incomplete.');
      }

      const updateQuery = 'UPDATE reviews SET rating = $1, comment = $2 WHERE id = $3 RETURNING *';
      const updateValues = [args.rating, args.comment, args.id];
      const updateResult = await pool.query(updateQuery, updateValues);

      return updateResult.rows[0];
    },

    deleteReview: async (parent: any, args: { id: number }, context: any): Promise<boolean> => {
      if (!context.user) {
        throw new AuthenticationError('You must be authenticated to delete a review.');
      }

      const query = 'SELECT * FROM reviews WHERE id = $1';
      const values = [args.id];
      const { rows } = await pool.query(query, values);

      if (rows.length === 0) {
        throw new UserInputError('Review not found.');
      }

      const review = rows[0];

      if (review.userId !== context.user.id) {
        throw new AuthenticationError('You are not authorized to delete this review.');
      }

      const deleteQuery = 'DELETE FROM reviews WHERE id = $1';
      const deleteValues = [args.id];
      await pool.query(deleteQuery, deleteValues);

      return true;
    },
  },
};

export default resolvers;
