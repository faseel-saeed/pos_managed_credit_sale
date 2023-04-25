odoo.define('pos_managed_credit_sale.PaymentScreen', function(require) {
    "use strict";

    const { parse } = require('web.field_utils');
    const { useErrorHandlers } = require('point_of_sale.custom_hooks');
    const NumberBuffer = require('point_of_sale.NumberBuffer');
    const { useListener } = require("@web/core/utils/hooks");
    const Registries = require('point_of_sale.Registries');
    const { isConnectionError } = require('point_of_sale.utils');
    const utils = require('web.utils');

    const PaymentScreen = require('point_of_sale.PaymentScreen');



    const ManagedCreditSalePaymentScreen = (PaymentScreen) => class extends PaymentScreen {

        async _finalizeValidation() {

            /*console.log("==========_finalizeValidation==========");

            console.log("==========paymentLines==========");
            console.log(this.paymentLines);
            console.log("==========paymentLines=========="); */


            let syncOrderResult, hasError, creditCheckResult;
            let isOverLimit = false;
            let title= '';
            let overLimitErrorMessage = '';

            if(this._is_splitOrder()){
                try {
                    //console.log("==========creditCheckResult==========");
                    let isCreditTransaction = this._is_credit();
                    let creditCheckResult = await this.env.pos.validate_credit_limit(this.currentOrder, isCreditTransaction);
                    //console.log(creditCheckResult);
                    //console.log("==========creditCheckResult==========");

                    //console.log(f);

                    if(!creditCheckResult.success){
                        isOverLimit = true;
                        title='Over Limit';
                        overLimitErrorMessage = creditCheckResult.message;
                    }
                }
                catch(Exception){
                    title='Error';
                    overLimitErrorMessage = Exception.message
                    console.log(Exception);
                    hasError= true;

                }

                if(isOverLimit || hasError){
                        this.showPopup('ErrorPopup', {
                                title: title,
                                body: overLimitErrorMessage
                            });
                         return;

                }
            }

            super._finalizeValidation();


        }

        _is_splitOrder(){
            //console.log(payment);
            const splitPayments = this.paymentLines.filter(payment => payment.payment_method.split_transactions);
            return splitPayments.length>0;

        }



        _is_credit(){
            const creditPayments = this.paymentLines.filter(payment => payment.payment_method.type=='pay_later');
            //console.log('credit',creditPayments);
            return creditPayments.length>0;
        }



	}

	Registries.Component.extend(PaymentScreen, ManagedCreditSalePaymentScreen);
	return ManagedCreditSalePaymentScreen;

});
