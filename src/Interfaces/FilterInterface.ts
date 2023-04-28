export enum TypeOfState {
  String = "string",
  Number = "number",
  Date = "date",
}

interface IStateFilter {
  name: string;
  operator: any[];
  typeOf: TypeOfState;
}

export { IStateFilter };
