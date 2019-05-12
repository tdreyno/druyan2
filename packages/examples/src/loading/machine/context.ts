import { Context as BaseContext } from "@druyan/druyan";
import { StateMap } from "./states";

export interface Context extends BaseContext<keyof typeof StateMap> {
  message?: string;
}
