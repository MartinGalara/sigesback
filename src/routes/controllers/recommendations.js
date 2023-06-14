const { Router } = require('express');
const { Recommendation } = require('../../db.js');

const router = Router();

router.get('/', async (req, res) => {
  try {
    const recommendations = await Recommendation.findAll();
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, text, image, flags } = req.body;
    const recommendation = await Recommendation.create({ title, text, image, flags });
    res.status(201).json(recommendation);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const recommendation = await Recommendation.findByPk(id);
    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }
    await recommendation.destroy();
    res.sendStatus(204);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, text, image, flags } = req.body;
    const recommendation = await Recommendation.findByPk(id);
    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }
    recommendation.title = title;
    recommendation.text = text;
    recommendation.image = image;
    recommendation.flags = flags;
    await recommendation.save();
    res.json(recommendation);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
