import { EVENT_TYPES } from '../../shared/services/beauty/BeautyEventService';

// Simple unit test for event types
describe('Beauty Event Types', () => {
  it('should have all expected event types', () => {
    const expected = new Set(['upload_start', 'upload_success', 'upload_failed', 'analysis_start', 'analysis_success', 'analysis_failed', 'report_view', 'share_created']);
    const actual = new Set(Object.values(EVENT_TYPES));
    expect.assertions(1);
    expect(expected).toEqual(actual);
  });
});

