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
        // First delete cellar_wine entries
        const { error: cellarWineError } = await supabaseAdmin
          .from('cellar_wine')
          .delete()
          .eq('cellar_id', cellarId);
        
        if (cellarWineError) {
          console.error(`Error deleting cellar wines for ${cellarId}:`, cellarWineError);
        }

        // Delete cellar invitations
        const { error: cellarInvitationError } = await supabaseAdmin
          .from('cellar_invitation')
          .delete()
          .eq('cellar_id', cellarId);
        
        if (cellarInvitationError) {
          console.error(`Error deleting cellar invitations for ${cellarId}:`, cellarInvitationError);
        }

        // Delete stock alerts for this cellar
        const { error: stockAlertError } = await supabaseAdmin
          .from('stock_alert')
          .delete()
          .eq('cellar_id', cellarId);
        
        if (stockAlertError) {
          console.error(`Error deleting stock alerts for ${cellarId}:`, stockAlertError);
        }

        // Delete user_cellar entries (correct column name: user_cellar_id)
        const { error: userCellarError } = await supabaseAdmin
          .from('user_cellar')
          .delete()
          .eq('user_cellar_id', cellarId);
        
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

    // STEP 5: Delete remaining user data that may not cascade properly
    console.log('Deleting remaining user data...');

    // Delete user's own user_cellar entries (membership in other cellars)
    await supabaseAdmin.from('user_cellar').delete().eq('user_id', userId);
    
    // Delete cellar invitations sent by user
    await supabaseAdmin.from('cellar_invitation').delete().eq('inviter_id', userId);
    
    // Delete cellar invitations received by user
    await supabaseAdmin.from('cellar_invitation').delete().eq('invitee_user_id', userId);

    // Delete event invitations sent by user
    await supabaseAdmin.from('event_invitation').delete().eq('inviter_id', userId);
    
    // Delete event invitations received by user
    await supabaseAdmin.from('event_invitation').delete().eq('invitee_user_id', userId);

    // Delete event access requests
    await supabaseAdmin.from('event_access_request').delete().eq('user_id', userId);

    // Delete event payments
    await supabaseAdmin.from('event_payment').delete().eq('user_id', userId);

    // Delete event refund requests
    await supabaseAdmin.from('event_refund_request').delete().eq('user_id', userId);

    // IMPORTANT: user_event.granted_by has a FK to auth.users with NO ACTION.
    // If this user granted access to others, auth deletion will fail unless we clear it.
    await supabaseAdmin.from('user_event').update({ granted_by: null }).eq('granted_by', userId);

    // Delete user_event entries for the user
    await supabaseAdmin.from('user_event').delete().eq('user_id', userId);

    // Delete user domain entries
    await supabaseAdmin.from('user_domain').delete().eq('user_id', userId);
    
    // Delete user domain applications
    await supabaseAdmin.from('user_domain_application').delete().eq('user_id', userId);

    // Delete user favorites
    await supabaseAdmin.from('user_favorite').delete().eq('user_id', userId);

    // Delete user follows (both directions)
    await supabaseAdmin.from('user_follow').delete().eq('follower_id', userId);
    await supabaseAdmin.from('user_follow').delete().eq('following_id', userId);
    
    // Delete user follow counts
    await supabaseAdmin.from('user_follow_counts').delete().eq('user_id', userId);

    // Delete user badges
    await supabaseAdmin.from('user_badge').delete().eq('user_id', userId);

    // Delete notifications
    await supabaseAdmin.from('notification').delete().eq('user_id', userId);

    // Delete CGU acceptances
    await supabaseAdmin.from('cgu_acceptance').delete().eq('user_id', userId);

    // Delete post comment likes by user
    await supabaseAdmin.from('post_comment_like').delete().eq('user_id', userId);

    // Delete post likes by user
    await supabaseAdmin.from('post_like').delete().eq('user_id', userId);

    // Delete post comments by user
    await supabaseAdmin.from('post_comment').delete().eq('user_id', userId);

    // Delete post mentions of user
    await supabaseAdmin.from('post_mention').delete().eq('mentioned_user_id', userId);

    // Delete posts (should cascade post_like, post_comment, post_hashtag, post_mention)
    await supabaseAdmin.from('post').delete().eq('user_id', userId);

    // Delete content reports by user
    await supabaseAdmin.from('content_report').delete().eq('reporter_id', userId);

    // Delete lesson completions and quiz results
    await supabaseAdmin.from('lesson_completion').delete().eq('user_id', userId);
    await supabaseAdmin.from('lesson_quiz_result').delete().eq('user_id', userId);
    await supabaseAdmin.from('user_lesson_unlock').delete().eq('user_id', userId);

    // Delete game propositions
    await supabaseAdmin.from('user_game_proposition').delete().eq('user_id', userId);

    // Delete organizer stripe account
    await supabaseAdmin.from('organizer_stripe_account').delete().eq('user_id', userId);

    // Delete user profile
    await supabaseAdmin.from('user_profiles').delete().eq('id', userId);

    // STEP 6: Delete user from auth.users
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
