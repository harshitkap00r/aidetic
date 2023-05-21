import { gql } from 'apollo-server';

// Define the GraphQL schema
const typeDefs = gql`
  type User {
    id: Int
    userName: String
    email: String
    password: String
  }

  type Movie {
    id: Int
    movieName: String
    description: String
    directorName: String
    releaseDate: String
  }

  type Review {
    id: Int
    movieId: Int
    userId: Int
    rating: Int
    comment: String
  }

  type Query {
    getUser(id: Int!): User
    getMovie(id: Int!): Movie
    getReviewsForMovie(movieId: Int!): [Review]
    getAllMovies: [Movie]
  }

  type Mutation {
    signUpUser(userName: String!, email: String!, password: String!): User
    loginUser(email: String!, password: String!): User
    changePassword(userId: Int!, newPassword: String!): User
    createMovie(movieName: String!, description: String!, directorName: String!, releaseDate: String!): Movie
    updateMovie(id: Int!, movieName: String, description: String, directorName: String, releaseDate: String): Movie
    deleteMovie(id: Int!): Boolean
    createReview(movieId: Int!, userId: Int!, rating: Int!, comment: String!): Review
    updateReview(id: Int!, rating: Int, comment: String): Review
    deleteReview(id: Int!): Boolean
  }
`;

export default typeDefs;
