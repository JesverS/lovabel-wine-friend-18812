import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ResetResult {
  success: number;
  failed: number;
  emails_sent: number;
  skipped: number;
  errors: Array<{ user_id: string; error: string }>;
}

function generateEmailHTML(fullName: string, unlockedCount: number): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .highlight { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed; }
          .button { display: inline-block; background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🍷 Wine Note</h1>
          </div>
          <div class="content">
            <p>Bonjour ${fullName || 'Cher apprenant'},</p>
            
            <div class="highlight">
              <h2 style="margin-top: 0; color: #7c3aed;">🎉 Bravo pour vos progrès !</h2>
              <p style="font-size: 18px; margin: 10px 0;">
                Cette semaine, vous avez complété <strong>${unlockedCount}</strong> leçon${unlockedCount > 1 ? 's' : ''}.
              </p>
              <p style="font-size: 16px; color: #666;">
                <strong>${unlockedCount}</strong> nouvelle${unlockedCount > 1 ? 's' : ''} leçon${unlockedCount > 1 ? 's' : ''} ${unlockedCount > 1 ? 'sont' : 'est'} maintenant disponible${unlockedCount > 1 ? 's' : ''} pour vous !
              </p>
            </div>
            
            <div style="text-align: center;">
              <a href="${Deno.env.get('SITE_URL')}/learning" class="button">
                Accéder à mes cours 📚
              </a>
            </div>
            
            <p style="margin-top: 30px; color: #666;">
              Continuez comme ça ! Chaque leçon complétée vous rapproche de la maîtrise de l'univers du vin.
            </p>
            
            <p style="margin-top: 20px;">
              À très vite sur Wine Note !<br>
              <strong>L'équipe Wine Note</strong>
            </p>
          </div>
          <div class="footer">
            <p>Wine Note - Votre parcours d'apprentissage du vin</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const results: ResetResult = {
    success: 0,
    failed: 0,
    emails_sent: 0,
    skipped: 0,
    errors: []
  };

  try {
    console.log('🚀 Démarrage du reset hebdomadaire des leçons');

    // 1. Récupérer tous les utilisateurs avec un profil
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, full_name, email');

    if (usersError) {
      console.error('❌ Erreur récupération utilisateurs:', usersError);
      throw usersError;
    }

    console.log(`📊 ${users?.length || 0} utilisateurs à traiter`);

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Aucun utilisateur à traiter', results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Traiter chaque utilisateur
    for (const user of users) {
      try {
        console.log(`\n👤 Traitement utilisateur: ${user.id}`);

        // Récupérer les 3 dernières leçons déverrouillées
        const { data: lastUnlocked, error: unlockedError } = await supabase
          .from('user_lesson_unlock')
          .select('lesson_id')
          .eq('user_id', user.id)
          .order('unlocked_at', { ascending: false })
          .limit(3);

        if (unlockedError) throw unlockedError;

        if (!lastUnlocked || lastUnlocked.length === 0) {
          console.log(`⏭️  Aucune leçon déverrouillée pour ${user.id}`);
          results.skipped++;
          continue;
        }

        const lastUnlockedIds = lastUnlocked.map(l => l.lesson_id);
        console.log(`📖 Dernières leçons déverrouillées: ${lastUnlockedIds.join(', ')}`);

        // Vérifier combien sont complétées
        const { data: completed, error: completedError } = await supabase
          .from('lesson_completion')
          .select('lesson_id')
          .eq('user_id', user.id)
          .in('lesson_id', lastUnlockedIds);

        if (completedError) throw completedError;

        const completedCount = completed?.length || 0;
        console.log(`✅ ${completedCount} leçon(s) complétée(s) sur ${lastUnlockedIds.length}`);

        if (completedCount === 0) {
          console.log(`⏭️  Aucune leçon complétée pour ${user.id}`);
          results.skipped++;
          continue;
        }

        // Récupérer toutes les leçons déjà déverrouillées
        const { data: allUnlocked, error: allUnlockedError } = await supabase
          .from('user_lesson_unlock')
          .select('lesson_id')
          .eq('user_id', user.id);

        if (allUnlockedError) throw allUnlockedError;

        const alreadyUnlockedIds = allUnlocked?.map(l => l.lesson_id) || [];

        // Trouver les prochaines leçons à débloquer
        const { data: nextLessons, error: nextLessonsError } = await supabase
          .from('lessons')
          .select('id, title')
          .not('id', 'in', `(${alreadyUnlockedIds.join(',')})`)
          .order('global_order', { ascending: true })
          .limit(completedCount);

        if (nextLessonsError) throw nextLessonsError;

        if (!nextLessons || nextLessons.length === 0) {
          console.log(`🎓 Plus de leçons à débloquer pour ${user.id}`);
          results.skipped++;
          continue;
        }

        console.log(`🔓 Déverrouillage de ${nextLessons.length} nouvelle(s) leçon(s)`);

        // Débloquer les leçons
        const unlockPromises = nextLessons.map(lesson =>
          supabase
            .from('user_lesson_unlock')
            .insert({
              user_id: user.id,
              lesson_id: lesson.id,
              unlocked_at: new Date().toISOString()
            })
        );

        await Promise.all(unlockPromises);

        console.log(`✅ Leçons déverrouillées: ${nextLessons.map(l => l.title).join(', ')}`);

        // Envoyer l'email si l'utilisateur a un email
        if (user.email) {
          try {
            await resend.emails.send({
              from: Deno.env.get('SENDER_EMAIL') || 'Wine Note <onboarding@resend.dev>',
              to: user.email,
              subject: `🍷 ${completedCount} nouvelle${completedCount > 1 ? 's' : ''} leçon${completedCount > 1 ? 's' : ''} disponible${completedCount > 1 ? 's' : ''} !`,
              html: generateEmailHTML(user.full_name, completedCount)
            });

            console.log(`📧 Email envoyé à ${user.email}`);
            results.emails_sent++;
          } catch (emailError) {
            console.error(`❌ Erreur envoi email pour ${user.id}:`, emailError);
            // On continue même si l'email échoue
          }
        }

        results.success++;
        console.log(`✅ Utilisateur ${user.id} traité avec succès`);

      } catch (userError: any) {
        console.error(`❌ Erreur pour utilisateur ${user.id}:`, userError);
        results.failed++;
        results.errors.push({
          user_id: user.id,
          error: userError.message || 'Erreur inconnue'
        });
      }
    }

    console.log('\n📊 Résumé final:');
    console.log(`  ✅ Succès: ${results.success}`);
    console.log(`  ❌ Échecs: ${results.failed}`);
    console.log(`  📧 Emails envoyés: ${results.emails_sent}`);
    console.log(`  ⏭️  Ignorés: ${results.skipped}`);

    return new Response(
      JSON.stringify({
        message: 'Reset hebdomadaire terminé',
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('❌ Erreur globale:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        results
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
