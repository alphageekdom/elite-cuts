import Image from 'next/image';
import SectionHead from '@/components/ui/SectionHead';
import Reveal from '@/components/uielements/Reveal';

const TEAM = [
  {
    name: 'Tomás Reyes',
    role: 'Founder · Head Butcher',
    bio: 'Trained at Smith & Wollensky NYC, then nine years as head butcher at a Beverly Hills steakhouse before opening EliteCuts.',
    fact: 'Bone-in côte de boeuf, 28-day aged.',
    img: '/images/our-story/team-tomas-reyes.jpg',
  },
  {
    name: 'Marcus Vega',
    role: 'Senior Butcher · Charcuterie',
    bio: 'Joined in 2021 from a Lyon-trained background. Runs the charcuterie program — house-cured saucisson, lardo, bresaola.',
    fact: 'Pork shoulder, 12 hours over oak.',
    img: '/images/our-story/team-marcus-vega.jpg',
  },
  {
    name: 'Elena Huang',
    role: 'Sourcing · Operations',
    bio: "Former chef de cuisine, now spends most of her week on the road visiting farms. Knows every rancher we buy from by their dog's name.",
    fact: 'Skirt steak, hot pan, two minutes a side.',
    img: '/images/our-story/team-elena-huang.jpg',
  },
  {
    name: 'Sam Okafor',
    role: 'Counter · Customer Care',
    bio: 'Started as a Saturday hire in 2022, now runs the front counter on weekends. Will absolutely talk you out of overcooking your wagyu.',
    fact: 'Hanger steak, marinated 24 hours.',
    img: '/images/our-story/team-sam-okafor.jpg',
  },
];

export default function OurStoryTeam() {
  return (
    <section className='bg-paper px-4 py-24 sm:px-8 lg:px-16'>
      <div className='mx-auto max-w-7xl'>
        <Reveal>
          <SectionHead label='The Counter' />
        </Reveal>

        <Reveal>
          <h2 className='font-display mb-6 max-w-[16ch] text-[clamp(38px,5vw,60px)] leading-[1.05] font-normal tracking-tight'>
            The people behind{' '}
            <em className='text-oxblood italic'>the case.</em>
          </h2>
        </Reveal>
        <Reveal>
          <p className='text-ink-soft mb-16 max-w-[50ch] text-base'>
            When you walk in on a Saturday morning, these are the faces. Most
            of us have been here longer than three years. Any of us will cut
            you a sample if you ask.
          </p>
        </Reveal>

        <div className='grid gap-5 sm:grid-cols-2 lg:grid-cols-4'>
          {TEAM.map((member) => (
            <Reveal key={member.name}>
              <div className='group border-line-soft bg-cream overflow-hidden rounded-sm border transition-transform duration-400 hover:-translate-y-1'>
                <div className='bg-cream-deep relative aspect-square w-full sm:aspect-3/4'>
                  <Image
                    src={member.img}
                    alt={member.name}
                    fill
                    className='object-cover contrast-[1.03] saturate-[0.95]'
                    sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'
                  />
                </div>
                <div className='p-5 pb-6'>
                  <div className='font-display mb-1 text-[20px] font-medium tracking-[-0.015em]'>
                    {member.name}
                  </div>
                  <div className='text-camel-deep mb-3.5 text-[11px] tracking-[0.18em] uppercase'>
                    {member.role}
                  </div>
                  <p className='text-ink-soft mb-3.5 text-[13px] leading-[1.55]'>
                    {member.bio}
                  </p>
                  <p className='border-line-soft font-display text-muted border-t pt-3.5 text-[13px] leading-normal italic'>
                    <strong className='text-ink font-medium not-italic'>
                      Cut of choice:
                    </strong>{' '}
                    {member.fact}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
