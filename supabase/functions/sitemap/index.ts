import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/xml; charset=utf-8',
};

const SITE_URL = 'https://winenote.me';

// Pages statiques avec leurs priorités et fréquences de mise à jour
const staticPages = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/learning', priority: '0.9', changefreq: 'weekly' },
  { path: '/events', priority: '0.9', changefreq: 'daily' },
  { path: '/guides', priority: '0.8', changefreq: 'monthly' },
  { path: '/about', priority: '0.7', changefreq: 'monthly' },
  { path: '/contact', priority: '0.6', changefreq: 'monthly' },
  { path: '/game', priority: '0.8', changefreq: 'weekly' },
  { path: '/cellars', priority: '0.7', changefreq: 'weekly' },
  { path: '/feed', priority: '0.7', changefreq: 'daily' },
  { path: '/search', priority: '0.7', changefreq: 'weekly' },
  { path: '/badges', priority: '0.5', changefreq: 'monthly' },
  { path: '/blog', priority: '0.8', changefreq: 'daily' },
  { path: '/legal', priority: '0.3', changefreq: 'yearly' },
  { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(date: string | null): string {
  if (!date) return new Date().toISOString().split('T')[0];
  return new Date(date).toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer les événements publics
    const { data: events } = await supabase
      .from('event')
      .select('slug, updated_at, start_date')
      .eq('is_public', true)
      .gte('start_date', new Date().toISOString())
      .order('start_date', { ascending: true })
      .limit(500);

    // Récupérer les profils publics
    const { data: users } = await supabase
      .from('user_profiles_public')
      .select('slug, is_public')
      .eq('is_public', true)
      .not('slug', 'is', null)
      .limit(500);

    // Récupérer les vins
    const { data: wines } = await supabase
      .from('wine')
      .select('id, updated_at')
      .order('updated_at', { ascending: false })
      .limit(500);

    // Récupérer les cours disponibles
    const { data: courses } = await supabase
      .from('courses')
      .select('id, updated_at')
      .eq('is_available', true)
      .order('id', { ascending: true });

    // Récupérer les domaines
    const { data: domains } = await supabase
      .from('domain')
      .select('slug, updated_at')
      .not('slug', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(500);

    // Récupérer les articles de blog publiés
    const { data: blogArticles } = await supabase
      .from('blog_article')
      .select('slug, updated_at, published_at')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(500);

    // Récupérer les celliers publics
    const { data: cellars } = await supabase
      .from('cellar')
      .select('slug, updated_at')
      .eq('is_public', true)
      .not('slug', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(500);

    // Générer le XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    // Pages statiques
    for (const page of staticPages) {
      xml += `  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    }

    // Événements publics
    if (events) {
      for (const event of events) {
        if (event.slug) {
          xml += `  <url>
    <loc>${SITE_URL}/event/${escapeXml(event.slug)}</loc>
    <lastmod>${formatDate(event.updated_at)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
        }
      }
    }

    // Profils publics
    if (users) {
      for (const user of users) {
        if (user.slug) {
          xml += `  <url>
    <loc>${SITE_URL}/user/${escapeXml(user.slug)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
        }
      }
    }

    // Vins
    if (wines) {
      for (const wine of wines) {
        xml += `  <url>
    <loc>${SITE_URL}/wine/${wine.id}</loc>
    <lastmod>${formatDate(wine.updated_at)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
`;
      }
    }

    // Cours
    if (courses) {
      for (const course of courses) {
        xml += `  <url>
    <loc>${SITE_URL}/course/${course.id}</loc>
    <lastmod>${formatDate(course.updated_at)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      }
    }

    // Domaines
    if (domains) {
      for (const domain of domains) {
        if (domain.slug) {
          xml += `  <url>
    <loc>${SITE_URL}/domain/${escapeXml(domain.slug)}</loc>
    <lastmod>${formatDate(domain.updated_at)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
        }
      }
    }

    // Articles de blog
    if (blogArticles) {
      for (const article of blogArticles) {
        xml += `  <url>
    <loc>${SITE_URL}/blog/${escapeXml(article.slug)}</loc>
    <lastmod>${formatDate(article.updated_at || article.published_at)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      }
    }

    xml += `</urlset>`;

    console.log(`Sitemap generated: ${staticPages.length} static + ${events?.length || 0} events + ${users?.length || 0} users + ${wines?.length || 0} wines + ${courses?.length || 0} courses + ${domains?.length || 0} domains + ${blogArticles?.length || 0} blog articles`);

    return new Response(xml, {
      headers: corsHeaders,
      status: 200,
    });
  } catch (error) {
    console.error('Sitemap generation error:', error);
    
    // En cas d'erreur, retourner un sitemap minimal avec les pages statiques
    let fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
    for (const page of staticPages) {
      fallbackXml += `  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    }
    fallbackXml += `</urlset>`;

    return new Response(fallbackXml, {
      headers: corsHeaders,
      status: 200,
    });
  }
});
