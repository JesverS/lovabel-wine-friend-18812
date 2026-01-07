import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Create admin client for user deletion
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log(`Starting account deletion for user: ${userId}`);

    // Get request body for cellars to delete
    const body = await req.json().catch(() => ({}));
    const cellarsToDelete: string[] = body.cellarsToDelete || [];

    // STEP 1: Get all posts with images to delete from storage
    console.log('Fetching posts with images...');
    const { data: posts, error: postsError } = await supabaseAdmin
      .from('post')
      .select('id, image_url')
      .eq('user_id', userId);

    if (postsError) {
      console.error('Error fetching posts:', postsError);
    }

    // STEP 2: Delete post images from storage
    if (posts && posts.length > 0) {
      console.log(`Found ${posts.length} posts, deleting images...`);
      
      for (const post of posts) {
        if (post.image_url) {
          try {
            // Extract path from URL
            // URL format: https://xxx.supabase.co/storage/v1/object/public/post/user_id/filename
            const url = new URL(post.image_url);
            const pathParts = url.pathname.split('/storage/v1/object/public/post/');
            if (pathParts.length > 1) {
              const filePath = pathParts[1];
              console.log(`Deleting post image: ${filePath}`);
              
              const { error: deleteError } = await supabaseAdmin.storage
                .from('post')
                .remove([filePath]);
              
              if (deleteError) {
                console.error(`Error deleting image ${filePath}:`, deleteError);
              }
            }
          } catch (e) {
            console.error('Error parsing image URL:', e);
          }
        }
      }
    }

    // STEP 3: Delete avatar from storage
    console.log('Deleting avatar...');
    try {
      // List all files in user's avatar folder
      const { data: avatarFiles } = await supabaseAdmin.storage
        .from('avatars')
        .list(userId);
      
      if (avatarFiles && avatarFiles.length > 0) {
        const filesToDelete = avatarFiles.map(f => `${userId}/${f.name}`);
        console.log(`Deleting avatar files:`, filesToDelete);
        
        const { error: avatarDeleteError } = await supabaseAdmin.storage
          .from('avatars')
          .remove(filesToDelete);
        
        if (avatarDeleteError) {
          console.error('Error deleting avatar:', avatarDeleteError);
        }
      }
    } catch (e) {
      console.error('Error deleting avatar:', e);
    }

    // STEP 4: Delete specified cellars (where user is sole owner)
    if (cellarsToDelete.length > 0) {
      console.log(`Deleting ${cellarsToDelete.length} cellars...`);
      
      for (const cellarId of cellarsToDelete) {
        // First delete cellar_wine entries (should cascade but being explicit)
        const { error: cellarWineError } = await supabaseAdmin
          .from('cellar_wine')
          .delete()
          .eq('cellar_id', cellarId);
        
        if (cellarWineError) {
          console.error(`Error deleting cellar wines for ${cellarId}:`, cellarWineError);
        }

        // Delete user_cellar entries
        const { error: userCellarError } = await supabaseAdmin
          .from('user_cellar')
          .delete()
          .eq('cellar_id', cellarId);
        
        if (userCellarError) {
          console.error(`Error deleting user_cellar for ${cellarId}:`, userCellarError);
        }

        // Delete the cellar itself
        const { error: cellarError } = await supabaseAdmin
          .from('cellar')
          .delete()
          .eq('id', cellarId);
        
        if (cellarError) {
          console.error(`Error deleting cellar ${cellarId}:`, cellarError);
        }
      }
    }

    // STEP 5: Delete user from auth.users
    // This will trigger ON DELETE CASCADE for:
    // - user_profiles
    // - post (and post_like, post_comment, post_mention, post_hashtag)
    // - user_cellar (remaining relations)
    // - user_follow
    // - user_badge
    // - notification
    // - content_report
    // - stock_alert
    // - etc.
    console.log('Deleting user from auth...');
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error('Error deleting user:', deleteUserError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete user account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Account deletion completed for user: ${userId}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
