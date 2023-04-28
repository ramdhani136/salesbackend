// filters=[["nama","=","Ilham Ramdhani"]]
// fields=["name","username","email"]

import { IStateFilter } from "../Interfaces";

interface IFilterQuery {
  status: boolean;
  data: any[];
}

export interface ISearch {
  filter: String[];
  value: any;
}

class FilterQuery {
  public getFilter(
    filters: any,
    stateFilter: IStateFilter[],
    search?: ISearch
  ): IFilterQuery {
    let genSearch: any[] = [];
    if (search) {
      if (search.filter.length > 0) {
        for (let item of search.filter) {
          genSearch.push({
            [`${item}`]: { $regex: search.value, $options: "i" },
          });
        }
      }
    }
    // Mengeset semua filter
    let valid: boolean = true;
    let allFilter: any[] = [];
    let unicFilter: any[] = [];
    if (filters.length > 0) {
      for (const filter of filters) {
        let validFilter = stateFilter.filter((item) => {
          // Cek apakah operator valid
          let validOperator: any = item.operator.filter(
            (i: any) => i == filter[1]
          );
          // End
          return item.name === filter[0] && validOperator.length !== 0;
        });

        // Cek validasi filter tersedia
        if (validFilter.length === 0) {
          valid = false;
        }
        let typeOf = validFilter[0].typeOf;
        let valueFilter =
          typeOf == "number"
            ? filter[2]
            : typeOf == "date"
            ? new Date(filter[2])
            : `${filter[2]}`;
        // End
        let field: any = {};
        let child: any = {};
        switch (filter[1]) {
          case "like":
            child.$regex = valueFilter;
            child.$options = "i";
            break;
          case "notlike":
            child.$not = { $regex: valueFilter, $options: "i" };
            break;
          case "=":
            if (typeOf === "date") {
              (child.$gte = new Date(`${filter[2]}T00:00:00.000Z`)),
                (child.$lt = new Date(`${filter[2]}T23:59:59.999Z`));
            } else {
              child.$eq = valueFilter;
            }

            break;
          case "!=":
            child.$ne = valueFilter;
            break;
          case ">":
            child.$gt = valueFilter;
            break;
          case ">=":
            child.$gte = valueFilter;
            break;
          case "<":
            child.$lt = valueFilter;
            break;
          case "<=":
            child.$lte = valueFilter;
            break;
        }

        if (Object.keys(child).length) {
          field[filter[0]] = child;
        }
        let isDuplicate = allFilter.filter(
          (item) => Object.keys(item)[0] == filter[0]
        );
        allFilter.push(field);
        if (isDuplicate.length === 0) {
          unicFilter.push(filter[0]);
        }
      }
    }

    let finalFilter: any = [];
    for (const item of unicFilter) {
      let ismerge = allFilter.filter((all) => Object.keys(all)[0] === item);
      let simpan;

      if (ismerge.length > 1) {
        const isDoc: string = Object.keys(ismerge[0])[0];
        const isTypeOf = stateFilter.find((item) => item.name == isDoc)?.typeOf;
        let op: {} =
          isTypeOf == "date" || isTypeOf == "number"
            ? { $and: ismerge }
            : { $or: ismerge };
        simpan = op;
      } else {
        simpan = ismerge[0];
      }
      finalFilter.push(simpan);
    }

    let filterData: any =
      Object.keys(finalFilter).length > 0
        ? genSearch.length > 0
          ? {
              $and: [{ $and: finalFilter }, { $or: genSearch }],
            }
          : {
              $and: finalFilter,
            }
        : genSearch.length > 0
        ? { $or: genSearch }
        : {};

    if (valid) {
      return {
        status: true,
        data: filterData,
      };
    } else {
      return { status: false, data: [] };
    }
  }

  public getField = (fields: any) => {
    let setField: any = {};
    for (const field of fields) {
      if (field != "password") {
        setField[field] = 1;
      }
    }
    return setField;
  };
}

export default new FilterQuery();
