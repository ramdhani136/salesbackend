import PermissionMiddleware, {
  selPermissionAllow,
  selPermissionType,
} from "../middleware/PermissionMiddleware";

interface dataI {
  user?: any;
  customer?: any;
  branch?: any;
  group?: any;
}

export const cekValidPermission = async (
  userId: string,
  dataCheck: dataI,
  doc: selPermissionType
): Promise<boolean> => {
  const ListData: any = [
    {
      documentCheck: selPermissionAllow.USER,
      data: dataCheck.user,
    },
    {
      documentCheck: selPermissionAllow.BRANCH,
      data: dataCheck.branch,
    },
    {
      documentCheck: selPermissionAllow.CUSTOMER,
      data: dataCheck.customer,
    },
    {
      documentCheck: selPermissionAllow.CUSTOMERGROUP,
      data: dataCheck.group,
    },
  ];

  for (const item of ListData) {
    // Mengambil rincian permission user
    if (item.data) {
      const checkData = await PermissionMiddleware.getPermission(
        userId,
        item.documentCheck,
        doc
      );

      if (checkData.length > 0) {
        const cekValid = checkData.find(
          (i) => i.toString() === item.data.toString()
        );

        if (!cekValid) {
          return false;
        }
      }
    }
    // End
  }

  return true;
};
