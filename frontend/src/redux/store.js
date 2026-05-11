import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
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
export const useAppDispatch = useDispatch;
export const useAppSelector = useSelector;
