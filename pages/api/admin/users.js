import pool from '@/lib/db';
import bcrypt from 'bcryptjs';


export default async function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        const [users] = await pool.query('SELECT id, username, role FROM users');
        res.status(200).json(users);
      } catch (error) {
        res.status(500).json({ message: 'Failed to fetch users', error });
      }
      break;

    case 'POST':
      try {
        const { username, password, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [
          username,
          hashedPassword,
          role,
        ]);
        res.status(201).json({ message: 'User added successfully' });
      } catch (error) {
        res.status(500).json({ message: 'Failed to add user', error });
      }
      break;

    case 'DELETE':
      try {
        const { id } = req.body;
        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        res.status(200).json({ message: 'User deleted successfully' });
      } catch (error) {
        res.status(500).json({ message: 'Failed to delete user', error });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
