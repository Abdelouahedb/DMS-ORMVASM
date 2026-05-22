import pool from '@/lib/db';

export default async function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        const [services] = await pool.query('SELECT id, name FROM services');
        res.status(200).json(services);
      } catch (error) {
        res.status(500).json({ message: 'Failed to fetch services', error });
      }
      break;

    case 'POST':
      try {
        const { name } = req.body;
        await pool.query('INSERT INTO services (name) VALUES (?)', [name]);
        res.status(201).json({ message: 'Service added successfully' });
      } catch (error) {
        res.status(500).json({ message: 'Failed to add service', error });
      }
      break;

    case 'DELETE':
      try {
        const { id } = req.body;
        await pool.query('DELETE FROM services WHERE id = ?', [id]);
        res.status(200).json({ message: 'Service deleted successfully' });
      } catch (error) {
        res.status(500).json({ message: 'Failed to delete service', error });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
