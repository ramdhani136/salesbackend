const HapusKarakter = (kata: String, karakter: String[]): String => {
    let hasil: string = "";
    for (let i = 0; i < kata.length; i++) {
      let cek = karakter.includes(kata[i]);
      if (!cek) {
        hasil += kata[i];
      }
    }

    return hasil;
  };

  export default HapusKarakter