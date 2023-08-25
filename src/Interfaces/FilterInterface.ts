export enum TypeOfState {
  String = "string",
  Number = "number",
  Date = "date",
}

interface IInput {
  valueData: any;
  valueInput: String;
  other?: any;
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
