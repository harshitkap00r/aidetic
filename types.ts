export interface User {
    id: number;
    userName: string;
    email: string;
    password: string;
  }
  
  export interface Movie {
    id: number;
    movieName: string;
    description: string;
    directorName: string;
    releaseDate: string;
  }
  
  export interface Review {
    id: number;
    movieId: number;
    userId: number;
    rating: number;
    comment: string;
  }
  