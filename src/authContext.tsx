import { createContext, useContext } from "react";
import { User } from "firebase/auth";

// Define the shape of your Auth Context.
interface AuthContextType {
  currentUser: User | null;
  isAuthorized: boolean;
}

// Create the actual context, providing default values if not set.
export const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isAuthorized: false,
});

// A helper hook to access the context in any component.
export function useAuthContext() {
  return useContext(AuthContext);
}
