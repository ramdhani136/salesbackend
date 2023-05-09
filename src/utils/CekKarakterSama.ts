const CekKarakterSama = (kata: String) => {
  var karakterPertama = kata.charAt(0); // Mendapatkan karakter pertama dari kata
  for (var i = 1; i < kata.length; i++) {
    if (kata.charAt(i) !== karakterPertama) {
      return false; // Karakter tidak sama dengan karakter pertama, mengembalikan false
    }
  }
  return true; // Semua karakter sama dengan karakter pertama, mengembalikan true
};

export default CekKarakterSama;
