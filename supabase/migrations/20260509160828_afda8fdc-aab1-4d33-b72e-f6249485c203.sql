
-- Backfill resource tags so the navigator can match the 6 hackathon personas more meaningfully.
-- These updates only ADD inferred tags from titles/descriptions — they never overwrite existing data.

-- Communities
UPDATE public.resources
SET communities = ARRAY(SELECT DISTINCT unnest(coalesce(communities, '{}'::text[]) || ARRAY['Veterans']::text[]))
WHERE NOT ('Veterans' = ANY(coalesce(communities,'{}')))
  AND (title ILIKE '%veteran%' OR description ILIKE '%veteran%');

UPDATE public.resources
SET communities = ARRAY(SELECT DISTINCT unnest(coalesce(communities, '{}'::text[]) || ARRAY['Women']::text[]))
WHERE NOT ('Women' = ANY(coalesce(communities,'{}')))
  AND (title ILIKE '%women%' OR description ILIKE '%women%' OR title ILIKE '%female%');

UPDATE public.resources
SET communities = ARRAY(SELECT DISTINCT unnest(coalesce(communities, '{}'::text[]) || ARRAY['Rural']::text[]))
WHERE NOT ('Rural' = ANY(coalesce(communities,'{}')))
  AND (title ILIKE '%rural%' OR description ILIKE '%rural%');

UPDATE public.resources
SET communities = ARRAY(SELECT DISTINCT unnest(coalesce(communities, '{}'::text[]) || ARRAY['Students']::text[]))
WHERE NOT ('Students' = ANY(coalesce(communities,'{}')))
  AND (title ILIKE ANY (ARRAY['%student%','%university%','%college%','%lassonde%','%campus%','%entrepreneur center%','%entrepreneur institute%'])
       OR description ILIKE '%student%');

UPDATE public.resources
SET communities = ARRAY(SELECT DISTINCT unnest(coalesce(communities, '{}'::text[]) || ARRAY['Underrepresented']::text[]))
WHERE NOT ('Underrepresented' = ANY(coalesce(communities,'{}')))
  AND (title ILIKE ANY (ARRAY['%minority%','%latino%','%hispanic%','%suazo%','%underrepresented%','%diverse%'])
       OR description ILIKE ANY (ARRAY['%minority%','%latino%','%underserved%','%underrepresented%']));

-- Stages — infer from common signals
UPDATE public.resources
SET stages = ARRAY(SELECT DISTINCT unnest(coalesce(stages,'{}'::text[]) || ARRAY['Idea','Pre-seed']::text[]))
WHERE coalesce(array_length(stages,1),0) = 0
  AND (title ILIKE ANY (ARRAY['%idea%','%pre-seed%','%incubator%','%accelerator%','%student%','%entrepreneur center%','%entrepreneur institute%','%lassonde%','%get started%','%bolder way%','%score%','%sbdc%','%small business development%'])
       OR description ILIKE ANY (ARRAY['%pre-seed%','%early-stage%','%first time founder%','%idea stage%']));

UPDATE public.resources
SET stages = ARRAY(SELECT DISTINCT unnest(coalesce(stages,'{}'::text[]) || ARRAY['Seed','Series A+']::text[]))
WHERE coalesce(array_length(stages,1),0) = 0
  AND (title ILIKE ANY (ARRAY['%angel%','%venture%','%vc%','%capital%','%investor%','%growth%','%scale%'])
       OR description ILIKE ANY (ARRAY['%angel%','%series a%','%venture capital%','%scaling%','%growth stage%']));

UPDATE public.resources
SET stages = ARRAY(SELECT DISTINCT unnest(coalesce(stages,'{}'::text[]) || ARRAY['Bootstrapped']::text[]))
WHERE coalesce(array_length(stages,1),0) = 0
  AND (title ILIKE ANY (ARRAY['%small business%','%sba%','%score%','%sbdc%','%veteran%','%agriculture%','%rural%']));

-- Topics — infer to power need-based matching
UPDATE public.resources
SET topics = ARRAY(SELECT DISTINCT unnest(coalesce(topics,'{}'::text[]) || ARRAY['Capital']::text[]))
WHERE NOT ('Capital' = ANY(coalesce(topics,'{}')))
  AND (title ILIKE ANY (ARRAY['%capital%','%fund%','%grant%','%loan%','%angel%','%venture%','%vc%','%invest%','%financ%'])
       OR description ILIKE ANY (ARRAY['%funding%','%grant%','%loan%','%capital%','%investor%']));

UPDATE public.resources
SET topics = ARRAY(SELECT DISTINCT unnest(coalesce(topics,'{}'::text[]) || ARRAY['Mentorship']::text[]))
WHERE NOT ('Mentorship' = ANY(coalesce(topics,'{}')))
  AND (title ILIKE ANY (ARRAY['%mentor%','%coach%','%advisor%','%score%','%sbdc%'])
       OR description ILIKE ANY (ARRAY['%mentor%','%coaching%','%advis%','%one-on-one%']));

UPDATE public.resources
SET topics = ARRAY(SELECT DISTINCT unnest(coalesce(topics,'{}'::text[]) || ARRAY['R&D']::text[]))
WHERE NOT ('R&D' = ANY(coalesce(topics,'{}')))
  AND (title ILIKE ANY (ARRAY['%research%','%innovation center%','%lab%','%commercialization%','%tech transfer%','%phd%','%university%'])
       OR description ILIKE ANY (ARRAY['%research%','%commercializ%','%lab space%','%intellectual property%']));

UPDATE public.resources
SET topics = ARRAY(SELECT DISTINCT unnest(coalesce(topics,'{}'::text[]) || ARRAY['Compliance']::text[]))
WHERE NOT ('Compliance' = ANY(coalesce(topics,'{}')))
  AND (title ILIKE ANY (ARRAY['%fda%','%regulat%','%compliance%','%license%','%permit%','%medical device%','%export%','%international%'])
       OR description ILIKE ANY (ARRAY['%fda%','%regulat%','%export%','%international market%','%compliance%']));

UPDATE public.resources
SET topics = ARRAY(SELECT DISTINCT unnest(coalesce(topics,'{}'::text[]) || ARRAY['Workspace']::text[]))
WHERE NOT ('Workspace' = ANY(coalesce(topics,'{}')))
  AND (title ILIKE ANY (ARRAY['%coworking%','%incubator%','%workspace%','%office%','%lab space%']));

-- Industries — add Life Sciences for med device / FDA / health / biotech
UPDATE public.resources
SET industries = ARRAY(SELECT DISTINCT unnest(coalesce(industries,'{}'::text[]) || ARRAY['Life Sciences']::text[]))
WHERE NOT ('Life Sciences' = ANY(coalesce(industries,'{}')))
  AND (title ILIKE ANY (ARRAY['%biohive%','%life science%','%medical%','%biotech%','%fda%','%health%','%pharma%'])
       OR description ILIKE ANY (ARRAY['%medical device%','%life sciences%','%biotech%','%fda%','%health%']));
