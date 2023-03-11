# -*- coding: utf-8 -*-


import logging
import pprint
import json

from odoo.exceptions import ValidationError, UserError
from odoo import api, fields, models, tools, _
from odoo.tools import float_compare, float_is_zero

import psycopg2

_logger = logging.getLogger(__name__)


def _get_message_obj(failed_order_ids, processed_orders):
    num_failed = len(failed_order_ids)
    if num_failed > 0:
        return {
            "success": False,
            "processedOrders": processed_orders,
            "failedOrders": failed_order_ids,
            "message": _("%s Orders failed. Reason: Customer credit limit reached or"
                         " customer does not have a credit limit.", num_failed)
        }
    else:
        return {
            "success": True,
            "processedOrders": processed_orders,
            "failedOrders": failed_order_ids,
            "message": "All orders within limit"
        }



class PosOrder(models.Model):
    _inherit = 'pos.order'


    # this function manages the error state when customer limit is reached

    @api.model
    def validate_credit_limit(self, orders, draft=False):
        """ Validates the credit limit from the frontend before sending the order

        :param orders: dictionary with the orders to be validated.
        :type orders: dict.
        :Returns: Object -- indicating the status of the validation, failed and valid orders
        """

        failed_order_ids = []
        order_ids = []
        for order in orders:
            existing_order = False
            credit_limit_reached = self._is_credit_limit_reached(order, existing_order)
            if credit_limit_reached[1]:
                failed_order_ids.append(credit_limit_reached[0])
            else:
                order_ids.append(credit_limit_reached[0])

        return _get_message_obj(failed_order_ids, order_ids)



    def _is_credit_limit_reached(self, order, existing_order):
        order_fields = order['data']

        date_order = fields.Datetime.now()
        company_id = self.env['pos.session'].browse(order_fields['pos_session_id']).company_id
        partner_id = self.env['res.partner'].browse(order_fields['partner_id'])
        pricelist_id = self.env['product.pricelist'].browse(order_fields['pricelist_id'])

        currency_rate = self.env['res.currency']._get_conversion_rate(company_id.currency_id,
                                                                      pricelist_id.currency_id,
                                                                      company_id, date_order)

        # _logger.info("PARTNER ID:\n%s", json.dumps(partner_id))
        # _logger.info("PRICE_LIST:\n%s", pprint.pformat(pricelist_id))

        total_credit = 0
        total_credit_payment_lines = 0

        for statement_id in order_fields['statement_ids']:
            method = statement_id[2]
            payment_method_id = self.env['pos.payment.method'].browse(method['payment_method_id'])
            if not payment_method_id.journal_id:
                total_credit_payment_lines += 1
                total_credit += method['amount']

        if order_fields['partner_id'] is False and total_credit_payment_lines > 0:
            msg = _('partner is required for credit payment for order %s\n', order_fields['name'])
            _logger.info(msg)
            return [order_fields['name'], True]

        if partner_id.name is False and total_credit_payment_lines > 0:
            msg = _('partner is required for credit payment for order %s\n', order_fields['name'])
            _logger.info(msg)
            return [order_fields['name'], True]

        if partner_id and partner_id.use_partner_credit_limit is False and total_credit_payment_lines > 0:
            msg = _('%s partner does not have a credit limit for order %s\n', partner_id.name, order_fields['name'])
            _logger.info(msg)
            return [order_fields['name'], True]

        calculated_new_credit_val = partner_id.commercial_partner_id.credit + (total_credit * currency_rate)

        if partner_id.credit_limit and calculated_new_credit_val > partner_id.credit_limit:
            msg = _('%s has reached its Credit Limit of : %s for order %s\n',
                    partner_id.name,
                    partner_id.credit_limit,
                    order_fields['name'])
            _logger.info(msg)
            return [order_fields['name'], True]

        else :
            return [order_fields['name'], False]
