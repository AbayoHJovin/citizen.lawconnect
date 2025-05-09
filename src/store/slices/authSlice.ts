import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  loginByEmail,
  refreshAccessToken,
  setAccessToken,
  getAccessToken,
  removeAccessToken,
  isTokenExpired,
} from "@/services/authService";
import API from "../../lib/axios";
import { jwtDecode } from "jwt-decode";

interface TokenResponse {
  message: string;
  data: string;
}

interface JwtPayload {
  sub: string;
  fullName?: string;
  phone?: string;
  exp: number;
  iat: number;
  [key: string]: unknown;
}

interface User {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  languagePreference: string;
  location: string;
}

interface AuthError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface LoginByEmailPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  fullName: string;
  email: string;
  phoneNumber: string;
  languagePreference: string;
  location: string;
  password: string;
  confirmPassword: string;
}

interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface BackendCitizen {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  citizen: {
    id: string;
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
  };
}

interface CitizenDto {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  languagePreference: string;
  location: string;
}

interface CitizenResponse {
  data: CitizenDto;
}

interface ApiResponse<T> {
  data: T;
}

const initialState: AuthState = {
  isAuthenticated: !!getAccessToken(),
  user: null,
  loading: false,
  error: null,
};

export const checkAuth = createAsyncThunk(
  "auth/checkAuth",
  async (_, { rejectWithValue }) => {
    try {
      const token = getAccessToken();

      // If no token, clear state and reject
      if (!token) {
        removeAccessToken();
        return rejectWithValue("No authentication token found");
      }

      // If token exists, check if it's expired
      if (isTokenExpired(token)) {
        try {
          const refreshResponse = await refreshAccessToken();
          if (refreshResponse.data) {
            setAccessToken(refreshResponse.data);
            // Fetch user data with new token
            const decoded = jwtDecode<JwtPayload>(refreshResponse.data);
            const userResponse = await API.get<ApiResponse<CitizenDto>>(
              `/citizens/find-by-email?email=${decoded.sub}`
            );
            return {
              accessToken: refreshResponse.data,
              citizen: userResponse.data.data,
            };
          }
        } catch (refreshError) {
          removeAccessToken();
          throw new Error("Token refresh failed");
        }
      }

      // Token is valid, fetch user data
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        const userResponse = await API.get<ApiResponse<CitizenDto>>(
          `/citizens/find-by-email?email=${decoded.sub}`
        );
        return {
          accessToken: token,
          citizen: userResponse.data.data,
        };
      } catch (userError) {
        removeAccessToken();
        throw new Error("Failed to fetch user data");
      }
    } catch (error: unknown) {
      const authError = error as AuthError;
      removeAccessToken();
      return rejectWithValue(authError.response?.data?.message || "");
    }
  }
);

export const loginByEmailThunk = createAsyncThunk(
  "auth/loginByEmail",
  async (credentials: LoginByEmailPayload, { rejectWithValue }) => {
    try {
      const response = await loginByEmail(
        credentials.email,
        credentials.password
      );
      setAccessToken(response.accessToken);

      // Fetch complete user data
      const userResponse = await API.get<ApiResponse<CitizenDto>>(
        `/citizens/find-by-email?email=${credentials.email}`
      );

      return {
        accessToken: response.accessToken,
        citizen: userResponse.data.data,
      };
    } catch (error: unknown) {
      const authError = error as AuthError;
      return rejectWithValue(
        authError.response?.data?.message || "Invalid credentials"
      );
    }
  }
);

export const refreshTokenThunk = createAsyncThunk(
  "auth/refreshToken",
  async (_, { rejectWithValue }) => {
    try {
      const response = await refreshAccessToken();
      if (response.data) {
        setAccessToken(response.data);

        // Fetch user data using the token
        const userResponse = await API.get<CitizenResponse>("/citizens/me", {
          headers: {
            Authorization: `Bearer ${response.data}`,
          },
        });

        return {
          accessToken: response.data,
          citizen: {
            id: userResponse.data.data.id,
            fullName: userResponse.data.data.fullName,
            email: userResponse.data.data.email,
            phoneNumber: userResponse.data.data.phoneNumber,
            languagePreference:
              userResponse.data.data.languagePreference || "en",
            location: userResponse.data.data.location || "",
          },
        };
      }
      throw new Error("No access token received");
    } catch (error: unknown) {
      const authError = error as AuthError;
      return rejectWithValue(
        authError.response?.data?.message || "Token refresh failed"
      );
    }
  }
);

export const registerCitizen = createAsyncThunk(
  "auth/registerCitizen",
  async (payload: RegisterPayload, { rejectWithValue }) => {
    try {
      const response = await API.post("/citizens/add", payload);
      return response.data;
    } catch (error: unknown) {
      const authError = error as AuthError;
      return rejectWithValue(
        authError.response?.data?.message || "Registration failed"
      );
    }
  }
);

export const changePassword = createAsyncThunk(
  "auth/changePassword",
  async (payload: ChangePasswordPayload, { rejectWithValue }) => {
    try {
      const response = await API.put("/citizens/change-password", payload);
      return response.data;
    } catch (error: unknown) {
      const authError = error as AuthError;
      return rejectWithValue(
        authError.response?.data?.message || "Password change failed"
      );
    }
  }
);

export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error("No access token found");
      }

      // Get email from token
      const decoded = jwtDecode<JwtPayload>(token);
      const email = decoded.sub;

      // Fetch complete user data
      const response = await API.get<ApiResponse<CitizenDto>>(
        `/citizens/find-by-email?email=${email}`
      );
      return response.data.data;
    } catch (error: unknown) {
      const authError = error as AuthError;
      return rejectWithValue(
        authError.response?.data?.message || "Failed to fetch user data"
      );
    }
  }
);

export const logoutThunk = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await logout();
      return null;
    } catch (error) {
      return rejectWithValue("Logout failed");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.error = null;
      removeAccessToken();
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Check Auth
      .addCase(checkAuth.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload.citizen;
        state.loading = false;
        state.error = null;
      })
      .addCase(checkAuth.rejected, (state, action) => {
        state.isAuthenticated = false;
        state.user = null;
        state.loading = false;
        state.error = action.payload as string;
        removeAccessToken();
      })
      // Login by Email
      .addCase(loginByEmailThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginByEmailThunk.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload.citizen;
        state.loading = false;
        state.error = null;
      })
      .addCase(loginByEmailThunk.rejected, (state, action) => {
        state.isAuthenticated = false;
        state.user = null;
        state.loading = false;
        state.error = action.payload as string;
        removeAccessToken();
      })

      // Refresh Token
      .addCase(refreshTokenThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(refreshTokenThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.citizen;
      })
      .addCase(refreshTokenThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
      })
      // Fetch Current User
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.user = null;
        state.isAuthenticated = false;
      })
      // Logout
      .addCase(logoutThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.loading = false;
        state.error = null;
        // Navigate to home page will be handled in the component
      })
      .addCase(logoutThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
