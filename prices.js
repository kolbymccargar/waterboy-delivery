/* ================================================================
   prices.js — Master Price List
   Waterboy Delivery — single source of truth for all prices
   ================================================================ */

var WB_PRICES = {
  water: {
    ro5:        { name: '5-Gallon RO Water',       price: 11.99,  unit: 'per bottle' },
    alkaline5:  { name: '5-Gallon Alkaline Water', price: 13.99,  unit: 'per bottle' },
    hydrogen1:  { name: '1-Gallon Hydrogen Water', price: 10.99, unit: 'per gallon' },
    hydrogen3:  { name: '3-Gallon Hydrogen Water', price: 32.97, unit: 'per fill' },
    ro3:        { name: '3-Gallon RO Water',        price: 4.99,  unit: 'per bottle' },
    bottle5empty:  { name: '5-Gallon bottle (Empty)',     price: 12.99, unit: 'each' },
    bottle3empty:  { name: '3-Gallon bottle (Empty)',     price: 9.99,  unit: 'each' }
  },
  bundles: {
    solo:      { name: 'Solo Bundle',      price: 24.99,  bottles: 2,  desc: '2×5-gal / mo' },
    family:    { name: 'Family Bundle',    price: 45.99,  bottles: 4,  desc: '4×5-gal / mo' },
    household: { name: 'Household Bundle', price: 69.99,  bottles: 6,  desc: '6×5-gal / mo' },
    office:    { name: 'Office Bundle',    price: 94.99,  bottles: 8,  desc: '8×5-gal / mo' },
    max:       { name: 'Max Bundle',       price: 140.99,  bottles: 12, desc: '12×5-gal / mo' }
  },
  alkalineBundles: {
    solo:   { name: 'Alkaline Solo',      price: 27.99, bottles: 2,  desc: '2×5-gal / mo' },
    family: { name: 'Alkaline Family',    price: 54.99, bottles: 4,  desc: '4×5-gal / mo' },
    household: { name: 'Alkaline Household', price: 74.99,  bottles: 6,  desc: '6×5-gal / mo' },
    office:    { name: 'Alkaline Office',    price: 99.99,  bottles: 8,  desc: '8×5-gal / mo' },
    max:       { name: 'Alkaline Max',       price: 149.99, bottles: 12, desc: '12×5-gal / mo' }
  },
  addons: {
    lmntCan:     { name: 'LMNT Sparkling Electrolyte Can (16oz)', price: 4.99,  unit: 'per can' },
    lmntPacket:  { name: 'LMNT Zero-Sugar Electrolyte Packets',   price: 2.99,  unit: 'per packet', bulk: 39.99, bulkQty: 30 },
    zipfizz:     { name: 'Zipfizz Energy Drink Mix Combo Pack',   price: 39.99, unit: 'per 30-pack' },
    echo:        { name: 'Echo Hydrogen Prebiotic Drink Mix',      price: 4.99,  unit: 'per packet', bulk: 64.99, bulkQty: 30 }
  },
  dispensers: {
    brioBottom: { name: 'Brio Bottom-Load Dispenser', price: 279.99 },
    brioTop:    { name: 'Brio Top-Load Dispenser',    price: 129.99 }
  },
  delivery: {
    mile1: { label: '1 Mile',  price: 2.99, display: '$2.99' },
    mile2: { label: '2 Miles', price: 3.99, display: '$3.99' },
    mile3: { label: '3 Miles', price: 5.99, display: '$5.99' },
    mile4: { label: '4 Miles', price: 6.99, display: '$6.99' },
    mile5: { label: '5 Miles', price: 7.99, display: '$7.99' },
    mile6: { label: '6 Miles', price: 8.99, display: '$8.99' },
    mile7: { label: '7 Miles', price: 9.99, display: '$9.99' },
    mile8: { label: '8 Miles', price: 10.99, display: '$10.99' },
    mile9: { label: '9 Miles', price: 11.99, display: '$11.99' }
  }
};
