import { BlocBase } from "./BlocBase";
import { BlacEvent, EventParams } from "./Blac";

export interface BlacPlugin {
  name: string;

  onEvent<B extends BlacEvent>(event: B, bloc: BlocBase<any>, params?: EventParams[B]): void;
}
