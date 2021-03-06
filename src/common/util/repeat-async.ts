export async function repeatAsync<T>(fn: (params?: any) => Promise<T> | T, mustReturnData = false, ms = 5000): Promise<T | void> {
  return new Promise((resolve, reject) => {
    // FIXME add total timeout / number of retries?
    // FIXME add cleanup/cancel
    const wrapper = async () => {
      const start = Date.now();

      let data;
      let isSuccess = false;
      try {
        data = await fn();
        isSuccess = true;
      } catch (e) {
        console.log('ERROR: repeat async error', e);
      }

      if (!isSuccess || (mustReturnData && !data)) {
        const elapsed = Date.now() - start;
        const timeout = ms - elapsed > 0 ? ms - elapsed : 0;
        setTimeout(() => wrapper(), timeout);
      } else {
        resolve(data);
      }
    };
    wrapper();
  });
}
