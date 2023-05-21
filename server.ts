import { ApolloServer, AuthenticationError } from 'apollo-server';
import jwt from 'jsonwebtoken';
import typeDefs from './schema';
import resolvers from './resolvers';
import { User } from './types';

// Secret key for JWT token
const SECRET_KEY = 'secretcodeforjsonwebtokenverification ';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    // Retrieve the JWT token from the request headers
    const token = req.headers.authorization || '';

    // Verify and decode the JWT token
    try {
      const user = jwt.verify(token, SECRET_KEY) as User;
      return { user };
    } catch (error) {
      throw new AuthenticationError('Invalid or expired token');
    }
  },
});

server.listen().then(({ url }) => {
  console.log(`Server running at ${url}`);
});
