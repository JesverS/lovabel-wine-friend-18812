-- Add server-side validation constraints for user-generated content

-- Post table: limit content and image_url lengths
ALTER TABLE post 
  ADD CONSTRAINT post_content_length_check 
  CHECK (char_length(content) <= 5000);

ALTER TABLE post 
  ADD CONSTRAINT post_image_url_length_check 
  CHECK (image_url IS NULL OR char_length(image_url) <= 2048);

-- Post comment table: limit content length
ALTER TABLE post_comment 
  ADD CONSTRAINT post_comment_content_length_check 
  CHECK (char_length(content) <= 2000);

-- User profiles: limit text field lengths
ALTER TABLE user_profiles 
  ADD CONSTRAINT user_profiles_full_name_length_check 
  CHECK (full_name IS NULL OR char_length(full_name) <= 100);

ALTER TABLE user_profiles 
  ADD CONSTRAINT user_profiles_last_name_length_check 
  CHECK (last_name IS NULL OR char_length(last_name) <= 100);

ALTER TABLE user_profiles 
  ADD CONSTRAINT user_profiles_description_length_check 
  CHECK (description IS NULL OR char_length(description) <= 1000);

ALTER TABLE user_profiles 
  ADD CONSTRAINT user_profiles_address_length_check 
  CHECK (address IS NULL OR char_length(address) <= 500);

ALTER TABLE user_profiles 
  ADD CONSTRAINT user_profiles_city_length_check 
  CHECK (city IS NULL OR char_length(city) <= 100);

-- Wine comment table: limit comment length
ALTER TABLE user_wine_comment 
  ADD CONSTRAINT user_wine_comment_length_check 
  CHECK (comment IS NULL OR char_length(comment) <= 2000);

-- Event table: limit text field lengths
ALTER TABLE event 
  ADD CONSTRAINT event_name_length_check 
  CHECK (char_length(name) <= 200);

ALTER TABLE event 
  ADD CONSTRAINT event_description_length_check 
  CHECK (description IS NULL OR char_length(description) <= 5000);

-- Domain table: limit text field lengths
ALTER TABLE domain 
  ADD CONSTRAINT domain_name_length_check 
  CHECK (char_length(name) <= 200);

ALTER TABLE domain 
  ADD CONSTRAINT domain_description_length_check 
  CHECK (description IS NULL OR char_length(description) <= 2000);

-- Cellar table: limit text field lengths
ALTER TABLE cellar 
  ADD CONSTRAINT cellar_name_length_check 
  CHECK (char_length(name) <= 200);

ALTER TABLE cellar 
  ADD CONSTRAINT cellar_description_length_check 
  CHECK (description IS NULL OR char_length(description) <= 2000);

-- Wine table: limit text field lengths
ALTER TABLE wine 
  ADD CONSTRAINT wine_name_length_check 
  CHECK (char_length(name) <= 200);

ALTER TABLE wine 
  ADD CONSTRAINT wine_description_length_check 
  CHECK (description IS NULL OR char_length(description) <= 2000);