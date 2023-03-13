/* global waitForWebfonts */
odoo.define('pos_managed_credit_sale.models', function (require) {
"use strict";

var PosDB = require('point_of_sale.DB');
var config = require('web.config');


const Registries = require('point_of_sale.Registries');
const {PosGlobalState} = require('point_of_sale.models');


const ManagedCreditPosGlobalState = (PosGlobalState) => class extends PosGlobalState {
    // send an array of orders to the server
    // available options:
    // - timeout: timeout for the rpc call in ms
    // returns a promise that resolves with the list of
    // server generated ids for the validated orders
    validate_credit_limit (order, options) {

        let j = order.export_as_JSON();
        let orders = [
                        {id:j.uid,'data':j}
                        ]

        if (!orders || !orders.length) {
            return Promise.resolve(
                {'success':false,
                 'message':'Nothing to order'}
                );
        }


        if(!j.to_invoice){
             return {
                'success':false,
                'message':'Invoice is required for credit orders.'
             };
        }
        
        this.set_synch('connecting', orders.length);
        options = options || {};

        var self = this;
        var timeout = typeof options.timeout === 'number' ? options.timeout : 30000 * orders.length;

        // we try to send the order. shadow prevents a spinner if it takes too long. (unless we are sending an invoice,
        // then we want to notify the user that we are waiting on something )
        var args = [_.map(orders, function (order) {
                order.to_invoice = options.to_invoice || false;
                return order;
            })];

        args.push(options.draft || false);
        return this.env.services.rpc({
                model: 'pos.order',
                method: 'validate_credit_limit',
                args: args,
                kwargs: {context: this.env.session.user_context},
            }, {
                timeout: timeout,
                shadow: !options.to_invoice
            })
            .then(function (server_response) {
                self.failed = false;
                self.set_synch('connected');
                return server_response;
            }).catch(function (error){
                console.warn('Failed to validate orders:', orders);
                self.set_synch('disconnected');
                throw error;
            });
    }


}

Registries.Model.extend(PosGlobalState,ManagedCreditPosGlobalState);
return ManagedCreditPosGlobalState;



});
