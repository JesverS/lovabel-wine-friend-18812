-- Modifier la contrainte foreign key pour permettre SET NULL lors de la suppression d'une cave
ALTER TABLE event 
DROP CONSTRAINT IF EXISTS event_cellar_id_fkey;

ALTER TABLE event 
ADD CONSTRAINT event_cellar_id_fkey 
FOREIGN KEY (cellar_id) 
REFERENCES cellar(id) 
ON DELETE SET NULL;