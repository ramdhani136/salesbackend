export enum TypeOfState {
  String = "string",
  Number = "number",
  Date = "date",
}

interface IStateFilter {
  alias: String;
  name: string;
  operator: any[];
  typeOf: TypeOfState;
}

export { IStateFilter };
