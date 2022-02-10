const properties = require('./json/properties.json');
const users = require('./json/users.json');
const { Pool } = require('pg');
const pool = new Pool({
  user: 'noahvandenberg',
  password: '123',
  host: 'localhost',
  database: 'light_bnb'
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool
    .query(`
    SELECT * 
    FROM users 
    WHERE email = $1`, 
    [email])
    .then((result) => result.rows[0])
    .catch((err) => {
      console.log(err.message);
    });
}
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool
  .query(`
  SELECT * 
  FROM users 
  WHERE id = $1`, 
  [id])
  .then((result) => result.rows[0])
  .catch((err) => {
    console.log(err.message);
  });
}
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser =  function(user) {
  return pool
    .query(`
    INSERT INTO users (name, password, email) 
    VALUES ($1, $2, $3) 
    RETURNING *
    `, 
    [user.name, user.password, user.email])
    .then((result) => result.rows[0])
    .catch((err) => {
      console.log(err.message);
    });
}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  return pool
  .query(`
    SELECT reservations.*, properties.*, AVG(property_reviews.rating)
    FROM reservations
    JOIN properties ON reservations.property_id = properties.id
    JOIN property_reviews ON properties.id = property_reviews.property_id
    WHERE reservations.guest_id = $1 AND end_date < now()::date
    GROUP BY reservations.id, properties.id
    ORDER BY start_date DESC
    LIMIT $2;
  `, 
  [guest_id, limit])
  .then((result) => result.rows)
  .catch((err) => {
    console.log(err.message);
  });
}
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
 const getAllProperties = function (options, limit = 10) {
  // 1
  const queryParams = [];
  const addAND = () => {
    if (queryParams.length > 0 && queryParams.length < Object.keys(options).length) {
      queryString += `AND `;
    }
  }
  // 2
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) AS average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  if (Object.keys(options).length !== 0) {
    queryString += `WHERE `;

    for (const option in options) {

      console.log('Option: ', option, 'value: ', options[option])

      switch (option) {
        case 'city':
          addAND();
          queryParams.push(`%${options.city}%`);
          queryString += `city LIKE $${queryParams.length} `;
          break;
        case 'owner_id':
          addAND();
          queryParams.push(`${options.owner_id}`);
          queryString += `owner_id > $${queryParams.length} `;
          break;
        case 'minimum_price_per_night':
          addAND();
          queryParams.push(`${options.minimum_price_per_night}`);
          queryString += `(cost_per_night/100) > $${queryParams.length} `;
          break;
        case 'maximum_price_per_night':
          addAND();
          queryParams.push(`${options.maximum_price_per_night}`);
          queryString += `(cost_per_night/100) < $${queryParams.length} `;
          break;
        case 'minimum_rating':
          break;
      }

      // if (queryParams.length > 0 && queryParams.length < Object.keys(options).length) {
      //   console.log('NEW AND', Object.keys(options).length, queryParams.length)
      //   queryString += `AND `;
      // }

    }
  }

  // 4

  queryString += `
  GROUP BY properties.id`;

  if (options.minimum_rating) {
    queryParams.push(`${options.minimum_rating}`);
    queryString += `
    HAVING avg(property_reviews.rating) >= $${queryParams.length} `;
  }
  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  // 5
  console.log(options)
  console.log(queryString, queryParams);

  // 6
  return pool.query(queryString, queryParams).then((res) => res.rows);
};



exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
}
exports.addProperty = addProperty;