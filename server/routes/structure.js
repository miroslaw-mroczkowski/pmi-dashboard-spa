'use strict';
const router = require('express').Router();
const db = require('../db/schema');

// GET /api/structure — zwraca całą strukturę BU/LU/maszyny
router.get('/', (req, res) => {
  try {
    const bus = db.prepare('SELECT * FROM business_units ORDER BY id').all();
    const lus = db.prepare('SELECT * FROM line_units ORDER BY bu_id, display_order').all();
    const lines = db.prepare('SELECT * FROM lines ORDER BY lu_id, display_order').all();

    const result = bus.map((bu) => ({
      id: bu.id,
      name: bu.name,
      lu: lus
        .filter((lu) => lu.bu_id === bu.id)
        .map((lu) => ({
          id: lu.id,
          lines: lines.filter((l) => l.lu_id === lu.id).map((l) => l.line_number),
        })),
    }));

    res.json({ businessUnits: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

module.exports = router;
