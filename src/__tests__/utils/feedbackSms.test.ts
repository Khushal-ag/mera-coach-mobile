import { buildFeedbackSmsBody, buildFeedbackWebUrl } from '../../utils/feedbackSms';

describe('feedbackSms', () => {
  it('builds feedback URL with coach and client codes', () => {
    const url = buildFeedbackWebUrl({ coachCode: 'C1', clientCode: 'CL9' });
    expect(url).toContain('/feedback?');
    expect(url).toContain('coachCode=C1');
    expect(url).toContain('clientCode=CL9');
  });

  it('builds short SMS body', () => {
    const body = buildFeedbackSmsBody({
      clientName: 'Priya Sharma',
      coachName: 'Asha',
      feedbackUrl: 'https://mera-coach.com/feedback?coachCode=1&clientCode=2',
    });
    expect(body).toContain('Hi Priya');
    expect(body).toContain('https://mera-coach.com/feedback');
  });
});
