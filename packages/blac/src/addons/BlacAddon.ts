import { BlocBase } from '../BlocBase';

export type BlacAddonInit = (bloc: BlocBase<any>) => void;

export type BlacAddonEmit = (params: {
  oldState: unknown;
  newState: unknown;
  cubit: BlocBase<any>;
}) => void;

type BlacAddon = {
  name: string;
  onInit?: BlacAddonInit;
  onEmit?: BlacAddonEmit;
};

export default BlacAddon;
