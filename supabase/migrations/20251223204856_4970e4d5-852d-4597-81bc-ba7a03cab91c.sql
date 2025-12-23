-- Index pour vérifier rapidement les profils publics
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_public 
ON user_profiles(id) WHERE is_public = true;

-- Index composite pour vérifier les abonnements acceptés
CREATE INDEX IF NOT EXISTS idx_user_follow_accepted 
ON user_follow(follower_id, following_id) WHERE status = 'accepted';

-- Index sur post.user_id pour le filtrage par utilisateur
CREATE INDEX IF NOT EXISTS idx_post_user_id ON post(user_id);

-- Index sur post_comment.post_id
CREATE INDEX IF NOT EXISTS idx_post_comment_post_id ON post_comment(post_id);

-- Index sur post_like.post_id
CREATE INDEX IF NOT EXISTS idx_post_like_post_id ON post_like(post_id);

-- Index sur user_favorite.user_id
CREATE INDEX IF NOT EXISTS idx_user_favorite_user_id ON user_favorite(user_id);