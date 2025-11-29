import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { lesson_id, answers, score, max_score } = await req.json();
    
    if (!lesson_id || score == null || max_score == null) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[submit-lesson-quiz] User ${user.id} submitting quiz for lesson ${lesson_id}`);

    // 🧾 1️⃣ Récupération de la difficulté
    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select("difficulty")
      .eq("id", lesson_id)
      .single();

    if (lessonError || !lesson) {
      console.error("[submit-lesson-quiz] Lesson not found:", lessonError);
      throw new Error("Invalid lesson ID");
    }

    // ⚙️ 2️⃣ Définition des constantes
    const XP_BASE = 100;
    const MIN_FACTOR = 0.2; // 20% d'XP même si échec total

    const difficultyMultiplier = (() => {
      switch (lesson.difficulty) {
        case 1: return 0.8;
        case 2: return 1.0;
        case 3: return 1.2;
        case 4: return 1.5;
        case 5: return 2.0;
        default: return 1.0;
      }
    })();

    const performance = Math.max(0, Math.min(score / max_score, 1));

    // 💪 3️⃣ Calcul XP finale
    const xpEarned = Math.round(
      XP_BASE * (MIN_FACTOR + (performance * difficultyMultiplier))
    );

    console.log(`[submit-lesson-quiz] XP calculation: difficulty=${lesson.difficulty}, performance=${performance.toFixed(2)}, xpEarned=${xpEarned}`);

    // 🧾 4️⃣ Enregistrement du résultat du quiz
    const { error: quizError } = await supabase.from("lesson_quiz_result").insert({
      user_id: user.id,
      lesson_id: lesson_id,
      answers,
      score,
      max_score,
      submitted_at: new Date().toISOString(),
    });

    if (quizError) {
      console.error("[submit-lesson-quiz] Error inserting quiz result:", quizError);
      throw new Error("Failed to save quiz result");
    }

    // 🏁 5️⃣ Marquer la leçon comme complétée
    const { error: completionError } = await supabase
      .from("lesson_completion")
      .upsert({
        user_id: user.id,
        lesson_id: lesson_id,
        completed_at: new Date().toISOString(),
        counted_for_unlock: false,
      }, {
        onConflict: 'user_id,lesson_id',
        ignoreDuplicates: true
      });

    if (completionError) {
      console.error("[submit-lesson-quiz] Error marking lesson as completed:", completionError);
    }

    // 🧮 6️⃣ Mise à jour XP + niveau
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("xp, level")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("[submit-lesson-quiz] Error fetching user profile:", profileError);
      throw new Error("User profile not found");
    }

    let newXP = (profile.xp || 0) + xpEarned;
    let newLevel = profile.level || 1;

    // ⚡️ Système exponentiel doux
    let xpNeeded = Math.round(300 * Math.pow(newLevel, 1.4));

    while (newXP >= xpNeeded) {
      newXP -= xpNeeded;
      newLevel += 1;
      xpNeeded = Math.round(300 * Math.pow(newLevel, 1.4));
    }

    console.log(`[submit-lesson-quiz] Level progression: ${profile.level} -> ${newLevel}, XP: ${profile.xp} -> ${newXP}`);

    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        xp: newXP,
        level: newLevel,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("[submit-lesson-quiz] Error updating user profile:", updateError);
      throw new Error("Failed to update user profile");
    }

    // 📊 7️⃣ Enregistrer dans l'historique XP
    const { error: historyError } = await supabase.from("xp_history").insert({
      user_id: user.id,
      lesson_id,
      xp_earned: xpEarned,
      reason: "quiz_completed",
    });

    if (historyError) {
      console.error("[submit-lesson-quiz] Error inserting XP history:", historyError);
      // Non bloquant
    }

    console.log(`[submit-lesson-quiz] Success! User ${user.id} completed lesson ${lesson_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        xpEarned,
        newXP,
        newLevel,
        difficulty: lesson.difficulty,
        leveledUp: newLevel > (profile.level || 1),
        score,
        max_score,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("[submit-lesson-quiz] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
