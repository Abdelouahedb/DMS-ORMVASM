import pool from '@/lib/db';
import { solrClient , deleteById } from '@/lib/solrClient'; // Assuming you have a Solr client set up

export default async function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        const [documents] = await pool.query(`
          SELECT 
            id, 
            title, 
            author, 
            (SELECT name FROM services WHERE id = documents.service_id) AS service, 
            category, 
            upload_date AS date 
          FROM documents
        `);
        res.status(200).json(documents);
      } catch (error) {
        res.status(500).json({ message: 'Failed to fetch documents', error });
      }
      break;

    case 'POST':
      try {
        const { title, author, service_id, category, file_path } = req.body;
        await pool.query(
          'INSERT INTO documents (title, author, service_id, category, file_path, upload_date) VALUES (?, ?, ?, ?, ?, NOW())',
          [title, author, service_id, category, file_path]
        );
        res.status(201).json({ message: 'Document added successfully' });
      } catch (error) {
        res.status(500).json({ message: 'Failed to add document', error });
      }
      break;

    case 'DELETE':
      try {
        const { id } = req.body;
        console.log('Deleting document with ID:', id); // Debug log

        // Delete from the database
        const [result] = await pool.query('DELETE FROM documents WHERE id = ?', [id]);
        console.log('Delete result:', result); // Debug log

        if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'Document not found' });
        }

        // Delete the file from Solr
        console.log('Deleting document from Solr with ID:', id);
        await deleteById(id); // Use the deleteById function
        console.log('Document deleted from Solr successfully');

        res.status(200).json({ message: 'Document deleted successfully' });
      } catch (error) {
        console.error('Error deleting document:', error); // Debug log
        res.status(500).json({ message: 'Failed to delete document', error });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}