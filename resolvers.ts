import { AuthenticationError, ApolloError, UserInputError } from 'apollo-server';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { User, Movie, Review } from './types';

const prisma = new PrismaClient();  

const SECRET_KEY = 'secretcodeforjsonwebtokenverification ';

const resolvers = {
  Query: {
    getUser: async (parent: any, args: { id: number }): Promise<User | undefined> => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: args.id },
        });

        return user;
      } catch (error) {
        throw new ApolloError('Failed to fetch user', 'DATABASE_ERROR');
      }
    },

    getMovie: async (parent: any, args: { id: number }): Promise<Movie | undefined> => {
      try {
        const movie = await prisma.movie.findUnique({
          where: { id: args.id },
        });

        return movie;
      } catch (error) {
        throw new ApolloError('Failed to fetch movie', 'DATABASE_ERROR');
      }
    },

    getReviewsForMovie: async (parent: any, args: { movieId: number }): Promise<Review[]> => {
      try {
        const reviews = await prisma.review.findMany({
          where: { movieId: args.movieId },
        });

        return reviews;
      } catch (error) {
        throw new ApolloError('Failed to fetch reviews', 'DATABASE_ERROR');
      }
    },

    getAllMovies: async (parent: any, args: { sortBy?: string, filterBy?: string, page?: number, limit?: number }): Promise<Movie[]> => {
      try {
        const { sortBy, filterBy, page, limit } = args;

        const movies = await prisma.movie.findMany({
          where: {
            OR: [
              { movieName: { contains: filterBy || '' } },
              { directorName: { contains: filterBy || '' } },
            ],
          },
          orderBy: {
            [sortBy || 'id']: 'asc',
          },
          take: limit || undefined,
          skip: (page! - 1) * (limit || 0),
        });

        return movies;
      } catch (error) {
        throw new ApolloError('Failed to fetch movies', 'DATABASE_ERROR');
      }
    },
  },

  Mutation: {
    signUpUser: async (parent: any, args: User): Promise<User> => {
      try {
        const { userName, email, password } = args;

        const newUser: User = await prisma.user.create({
          data: {
            userName,
            email,
            password,
          },
        });

        const token = jwt.sign({ userId: newUser.id }, SECRET_KEY);

        return newUser;
      } catch (error) {
        throw new ApolloError('Failed to sign up user', 'DATABASE_ERROR');
      }
    },

    loginUser: async (parent: any, args: { email: string, password: string }): Promise<string> => {
      try {
        const { email, password } = args;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || user.password !== password) {
          throw new AuthenticationError('Invalid email or password');
        }

        const token = jwt.sign({ userId: user.id }, SECRET_KEY);

        return token;
      } catch (error) {
        throw new ApolloError('Failed to log in user', 'DATABASE_ERROR');
      }
    },

    changePassword: async (parent: any, args: { userId: number, newPassword: string }, context: any): Promise<User> => {
      try {
        if (!context.userId) {
          throw new AuthenticationError('Authentication required');
        }

        const { userId, newPassword } = args;

        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          throw new UserInputError('User not found');
        }

        if (user.id !== context.userId) {
          throw new AuthenticationError('You are not authorized to change the password of this user');
        }

        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { password: newPassword },
        });

        return updatedUser;
      } catch (error) {
        throw new ApolloError('Failed to change password', 'DATABASE_ERROR');
      }
    },

    createMovie: async (parent: any, args: Movie, context: any): Promise<Movie> => {
      try {
        if (!context.userId) {
          throw new AuthenticationError('Authentication required');
        }

        const { movieName, description, directorName, releaseDate } = args;

        const newMovie = await prisma.movie.create({
          data: {
            movieName,
            description,
            directorName,
            releaseDate,
            userId: context.userId,
          },
        });

        return newMovie;
      } catch (error) {
        throw new ApolloError('Failed to create movie', 'DATABASE_ERROR');
      }
    },

    updateMovie: async (parent: any, args: Movie, context: any): Promise<Movie | undefined> => {
      try {
        if (!context.userId) {
          throw new AuthenticationError('Authentication required');
        }

        const { id, movieName, description, directorName, releaseDate } = args;

        const movie = await prisma.movie.findUnique({
          where: { id },
        });

        if (!movie) {
          throw new UserInputError('Movie not found');
        }

        if (movie.userId !== context.userId) {
          throw new AuthenticationError('You are not authorized to update this movie');
        }

        const updatedMovie = await prisma.movie.update({
          where: { id },
          data: {
            movieName,
            description,
            directorName,
            releaseDate,
          },
        });

        return updatedMovie;
      } catch (error) {
        throw new ApolloError('Failed to update movie', 'DATABASE_ERROR');
      }
    },

    deleteMovie: async (parent: any, args: { id: number }, context: any): Promise<boolean> => {
      try {
        if (!context.userId) {
          throw new AuthenticationError('Authentication required');
        }

        const { id } = args;

        const movie = await prisma.movie.findUnique({
          where: { id },
        });

        if (!movie) {
          throw new UserInputError('Movie not found');
        }

        if (movie.userId !== context.userId) {
          throw new AuthenticationError('You are not authorized to delete this movie');
        }

        await prisma.movie.delete({
          where: { id },
        });

        return true;
      } catch (error) {
        throw new ApolloError('Failed to delete movie', 'DATABASE_ERROR');
      }
    },

    createReview: async (parent: any, args: Review, context: any): Promise<Review> => {
      try {
        if (!context.userId) {
          throw new AuthenticationError('Authentication required');
        }

        const { movieId, rating, comment } = args;

        const newReview = await prisma.review.create({
          data: {
            movieId,
            userId: context.userId,
            rating,
            comment,
          },
        });

        return newReview;
      } catch (error) {
        throw new ApolloError('Failed to create review', 'DATABASE_ERROR');
      }
    },

    updateReview: async (parent: any, args: Review, context: any): Promise<Review | undefined> => {
      try {
        if (!context.userId) {
          throw new AuthenticationError('Authentication required');
        }

        const { id, rating, comment } = args;

        const review = await prisma.review.findUnique({
          where: { id },
        });

        if (!review) {
          throw new UserInputError('Review not found');
        }

        if (review.userId !== context.userId) {
          throw new AuthenticationError('You are not authorized to update this review');
        }

        const updatedReview = await prisma.review.update({
          where: { id },
          data: { rating, comment },
        });

        return updatedReview;
      } catch (error) {
        throw new ApolloError('Failed to update review', 'DATABASE_ERROR');
      }
    },

    deleteReview: async (parent: any, args: { id: number }, context: any): Promise<boolean> => {
      try {
        if (!context.userId) {
          throw new AuthenticationError('Authentication required');
        }

        const { id } = args;

        const review = await prisma.review.findUnique({
          where: { id },
        });

        if (!review) {
          throw new UserInputError('Review not found');
        }

        if (review.userId !== context.userId) {
          throw new AuthenticationError('You are not authorized to delete this review');
        }

        await prisma.review.delete({
          where: { id },
        });

        return true;
      } catch (error) {
        throw new ApolloError('Failed to delete review', 'DATABASE_ERROR');
      }
    },
  },
};

export default resolvers;
