-- Add price field to cellar_wine for custom pricing
ALTER TABLE cellar_wine
ADD COLUMN price numeric;

COMMENT ON COLUMN cellar_wine.price IS 'Prix personnalisé du caviste pour ce vin (remplace wine.price si défini)';