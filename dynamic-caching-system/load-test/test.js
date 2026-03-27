import http from "k6/http";
import { check } from "k6";

export const options = {
  scenarios: {
    constant_load: {
      executor: "constant-arrival-rate",
      rate: 100, // 100 iterations per second
      timeUnit: "1s", // per second
      duration: "2m", // total duration of the test
      preAllocatedVUs: 6000, // pre-allocate 50 virtual users
      maxVUs: 7000, // allow up to 200 virtual users if needed
    },
  },
};

export default function () {
  const res = http.get("http://localhost:3000/api/sum", {
    timeout: '70s',
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
