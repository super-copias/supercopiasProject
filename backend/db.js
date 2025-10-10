const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const file = path.join(__dirname, 'db.json');
const adapter = new FileSync(file);
const db = low(adapter);

function init() {
  // asegurar estructura por defecto
  db.defaults({ usuarios: [], clientes: [], empleados: [] }).write();
  
  // crear usuario admin por defecto si no existe
  if (!db.get('usuarios').find({ username: 'admin' }).value()) {
    const bcrypt = require('bcryptjs');
    const { nanoid } = require('nanoid');
    const pwd = bcrypt.hashSync('Admin123!', 8);
    db.get('usuarios').push({ id: nanoid(), username: 'admin', password: pwd, role: 'admin' }).write();
  }

  // Agregar empleados de ejemplo si no existen
  if (db.get('empleados').value().length === 0) {
    const { nanoid } = require('nanoid');
    const empleadosEjemplo = [
      {
        id: nanoid(),
        nombre: 'Ana García López',
        telefono: '555-0101',
        email: 'ana.garcia@supercopias.com',
        puesto: 'gerente',
        departamento: 'Administración',
        salario: 25000,
        fechaIngreso: '2023-01-15',
        fechaRegistro: new Date('2023-01-15').toISOString(),
        activo: true,
        role: 'admin'
      },
      {
        id: nanoid(),
        nombre: 'Carlos Martínez Ruiz',
        telefono: '555-0102',
        email: 'carlos.martinez@supercopias.com',
        puesto: 'supervisor',
        departamento: 'Operaciones',
        salario: 18000,
        fechaIngreso: '2023-03-10',
        fechaRegistro: new Date('2023-03-10').toISOString(),
        activo: true,
        role: 'supervisor'
      },
      {
        id: nanoid(),
        nombre: 'María Elena Sánchez',
        telefono: '555-0103',
        email: 'maria.sanchez@supercopias.com',
        puesto: 'cajero',
        departamento: 'Ventas',
        salario: 12000,
        fechaIngreso: '2023-06-20',
        fechaRegistro: new Date('2023-06-20').toISOString(),
        activo: true
      },
      {
        id: nanoid(),
        nombre: 'José Antonio Rivera',
        telefono: '555-0104',
        email: 'jose.rivera@supercopias.com',
        puesto: 'tecnico',
        departamento: 'Mantenimiento',
        salario: 15000,
        fechaIngreso: '2023-04-05',
        fechaRegistro: new Date('2023-04-05').toISOString(),
        activo: true
      },
      {
        id: nanoid(),
        nombre: 'Laura Patricia Morales',
        telefono: '555-0105',
        email: 'laura.morales@supercopias.com',
        puesto: 'vendedor',
        departamento: 'Ventas',
        salario: 13000,
        fechaIngreso: '2023-05-12',
        fechaRegistro: new Date('2023-05-12').toISOString(),
        activo: true
      },
      {
        id: nanoid(),
        nombre: 'Roberto Hernández Vega',
        telefono: '555-0106',
        email: 'roberto.hernandez@supercopias.com',
        puesto: 'operador',
        departamento: 'Producción',
        salario: 11000,
        fechaIngreso: '2023-07-08',
        fechaRegistro: new Date('2023-07-08').toISOString(),
        activo: true
      },
      {
        id: nanoid(),
        nombre: 'Sofía Alejandra Castro',
        telefono: '555-0107',
        email: 'sofia.castro@supercopias.com',
        puesto: 'administrativo',
        departamento: 'Recursos Humanos',
        salario: 14000,
        fechaIngreso: '2023-02-20',
        fechaRegistro: new Date('2023-02-20').toISOString(),
        activo: true
      },
      {
        id: nanoid(),
        nombre: 'Miguel Ángel Torres',
        telefono: '555-0108',
        email: 'miguel.torres@supercopias.com',
        puesto: 'seguridad',
        departamento: 'Seguridad',
        salario: 10000,
        fechaIngreso: '2023-08-15',
        fechaRegistro: new Date('2023-08-15').toISOString(),
        activo: true
      },
      {
        id: nanoid(),
        nombre: 'Carmen Leticia Jiménez',
        telefono: '555-0109',
        email: 'carmen.jimenez@supercopias.com',
        puesto: 'limpieza',
        departamento: 'Mantenimiento',
        salario: 9000,
        fechaIngreso: '2023-09-01',
        fechaRegistro: new Date('2023-09-01').toISOString(),
        activo: true
      },
      {
        id: nanoid(),
        nombre: 'Fernando Raúl Mendoza',
        telefono: '555-0110',
        email: 'fernando.mendoza@supercopias.com',
        puesto: 'cajero',
        departamento: 'Ventas',
        salario: 12500,
        fechaIngreso: '2023-01-30',
        fechaRegistro: new Date('2023-01-30').toISOString(),
        activo: false // Empleado inactivo para mostrar variedad
      }
    ];

    db.get('empleados').push(...empleadosEjemplo).write();
    console.log('Empleados de ejemplo agregados a la base de datos');
  }
}

module.exports = { db, init };
