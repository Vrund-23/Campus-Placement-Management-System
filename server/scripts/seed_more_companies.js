const pool = require('../config/db');

const EXTRA_COMPANIES = [
  'Accenture', 'Cognizant', 'Capgemini', 'Tech Mahindra', 'HCL Technologies', 
  'Larsen & Toubro', 'Cisco', 'Dell', 'HP', 'Apple', 'Meta', 'Netflix', 'Alphabet',
  'Samsung', 'Sony', 'Panasonic', 'Bosch', 'Siemens', 'General Electric', 'Ford',
  'Toyota', 'Honda', 'Nissan', 'Hyundai', 'Volkswagen', 'BMW', 'Mercedes-Benz',
  'Audi', 'Porsche', 'Ferrari', 'Boeing', 'Airbus', 'Lockheed Martin', 'SpaceX',
  'Tesla', 'Nvidia', 'AMD', 'Qualcomm', 'Broadcom', 'Texas Instruments',
  'Micron Technology', 'Western Digital', 'Seagate', 'Salesforce', 'SAP', 'Oracle',
  'VMware', 'Red Hat', 'ServiceNow', 'Workday', 'Splunk', 'Palantir', 'Snowflake',
  'Databricks', 'Atlassian', 'Twilio', 'Zoom', 'Slack', 'Dropbox', 'Box',
  'DocuSign', 'Zendesk', 'HubSpot', 'Shopify', 'Square', 'Stripe', 'PayPal',
  'Mastercard', 'Visa', 'American Express', 'Goldman Sachs', 'Morgan Stanley',
  'JPMorgan Chase', 'Bank of America', 'Wells Fargo', 'Citigroup', 'HSBC',
  'Barclays', 'Credit Suisse', 'UBS', 'Deutsche Bank', 'Societe Generale',
  'BNP Paribas', 'Santander', 'ING', 'Unilever', 'Procter & Gamble', 'Johnson & Johnson',
  'Pfizer', 'Novartis', 'Roche', 'AstraZeneca', 'GlaxoSmithKline', 'Sanofi',
  'Bayer', 'TCS', 'Wipro', 'Infosys', 'Mindtree', 'LTI', 'Mphasis', 'Hexaware',
  'Zensar', 'Persistent Systems', 'Coforge', 'Cyient', 'Tata Elxsi', 'KPIT',
  'Birlasoft', 'Sonata Software', 'Mastek', 'Happiest Minds', 'Route Mobile',
  'IndiaMart', 'Info Edge', 'MakeMyTrip', 'Zomato', 'Swiggy', 'Flipkart',
  'Paytm', 'Ola', 'Uber', 'Airbnb', 'Booking.com', 'Expedia', 'TripAdvisor',
  'Yelp', 'Grubhub', 'DoorDash', 'Instacart', 'Postmates', 'Deliveroo'
];

async function seedMoreCompanies() {
  try {
    console.log('--- Starting to seed more companies ---');
    let count = 0;
    
    for (const compName of EXTRA_COMPANIES) {
      const website = `https://www.${compName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
      try {
        await pool.query(
          "INSERT INTO companies (name, website) VALUES($1, $2) ON CONFLICT (name) DO NOTHING",
          [compName, website]
        );
        count++;
      } catch (e) {
        console.error(`Failed to insert ${compName}:`, e.message);
      }
    }
    
    console.log(`Successfully added around ${count} new companies.`);
  } catch (err) {
    console.error('Error seeding companies:', err);
  } finally {
    pool.end();
  }
}

seedMoreCompanies();
