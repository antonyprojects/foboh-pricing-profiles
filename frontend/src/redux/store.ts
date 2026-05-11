import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";

import { productsReducer } from "./productsSlice";
import { customersReducer } from "./customersSlice";
import { profilesReducer } from "./profilesSlice";
import { builderReducer } from "./builderSlice";

export const store = configureStore({
  reducer: {
    products: productsReducer,
    customers: customersReducer,
    profiles: profilesReducer,
    builder: builderReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
