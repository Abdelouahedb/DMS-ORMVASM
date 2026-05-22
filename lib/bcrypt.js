const bcrypt = require('bcryptjs');
(async () => {
  const hashedPassword = await bcrypt.hash('userpassword', 10);
  console.log(hashedPassword);
})();
