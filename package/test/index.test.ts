import hello from './index';

test('Test hello', () => {
  expect(hello()).toBe('hello world');
});
