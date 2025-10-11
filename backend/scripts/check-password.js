const bcrypt = require('bcryptjs');

// Hash del admin en la DB
const adminHash = '$2a$10$T1AaTiFCWAt.ubexs.QkreJSTQRKRjPy2VeyQXCslX82feThi9tuW';

// Contraseñas posibles
const passwords = [
  'admin123',
  'Admin123', 
  'admin',
  'ADMIN123',
  'supercopias123',
  '123456'
];

console.log('🔍 Verificando contraseñas posibles para el usuario admin:');
console.log('Hash almacenado:', adminHash);
console.log('');

for (const pwd of passwords) {
  const isValid = bcrypt.compareSync(pwd, adminHash);
  console.log(`${isValid ? '✅' : '❌'} "${pwd}": ${isValid ? 'VÁLIDA' : 'inválida'}`);
}

// Si ninguna funciona, vamos a crear un hash nuevo para admin123
if (!passwords.some(pwd => bcrypt.compareSync(pwd, adminHash))) {
  console.log('\n🔧 Ninguna contraseña funcionó. Generando nuevo hash para "admin123":');
  const newHash = bcrypt.hashSync('admin123', 10);
  console.log('Nuevo hash para admin123:', newHash);
}