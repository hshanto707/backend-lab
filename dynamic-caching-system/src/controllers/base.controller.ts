import BaseService from "../services/base.service.js";

export default class BaseController {
  async getSum() {
    return await new BaseService().getSum();
  }
}