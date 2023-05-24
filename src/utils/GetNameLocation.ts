import axios from "axios";

interface IGetNameLocation {
  lat: number | String;
  lng: number | String;
}

export const GetNameLocation = async (data: IGetNameLocation): Promise<any> => {
  try {
    const result: any = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${data.lat}&lon=${data.lng}`
    );
    return result;
  } catch (error) {
    throw error;
  }
};
