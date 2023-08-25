export enum TypeOfState {
  String = "string",
  Number = "number",
  Date = "date",
}

interface IInput {
  name: String;
  value: any;
}

interface IStateFilter {
  alias: String;
  name: string;
  operator: any[];
  typeOf: TypeOfState;
  isSort?: Boolean;
  listData?: IInput[];
}

export { IStateFilter };
