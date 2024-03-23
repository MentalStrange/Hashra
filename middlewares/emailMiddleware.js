import { body, validationResult } from 'express-validator';

const validateEmail = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

export default validateEmail;
