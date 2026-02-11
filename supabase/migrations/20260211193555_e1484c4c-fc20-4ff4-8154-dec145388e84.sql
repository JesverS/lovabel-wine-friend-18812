
-- Ajouter politique SELECT sur user_favorite avec can_view_profile_content
CREATE POLICY "Favoris visibles selon confidentialite profil"
ON user_favorite FOR SELECT TO authenticated
USING (can_view_profile_content(auth.uid(), user_id));
