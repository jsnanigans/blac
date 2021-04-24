import { BlocOptions } from "./types";

export const LOCAL_STORAGE_PREFIX = "data.";

export const cubitDefaultOptions: Required<BlocOptions> = {
  persistKey: "",
  persistData: true,
};

